from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import uuid
import httpx
import logging
from decimal import Decimal

from app.config import settings
from app.database import get_db
from app.models.models import User, CoinLedger, AuditLog
from app.services import discord
from app.services.calagopus import build_calagopus_headers
from app.services.auth_utils import create_access_token, get_current_user
from app.api.security import run_login_security_checks
from app.api.referrals import apply_referral_code
from app.schemas.schemas import UserOut

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/login")
def login(ref: str | None = Query(None)):
    """
    Redirects the user to the Discord OAuth2 page.
    """
    discord_login_url = (
        f"https://discord.com/api/oauth2/authorize"
        f"?client_id={settings.DISCORD_CLIENT_ID}"
        f"&redirect_uri={httpx.URL(settings.DISCORD_REDIRECT_URI)}"
        f"&response_type=code"
        f"&scope=identify%20email"
        f"{f'&state={ref}' if ref else ''}"
    )
    return RedirectResponse(discord_login_url)

@router.get("/callback")
async def callback(request: Request, code: str = Query(...), state: str | None = Query(None), ref: str | None = Query(None), db: Session = Depends(get_db)):
    """
    Handles the Discord OAuth2 callback, performs registration and Calagopus syncing.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    # 1. Exchange authorization code for tokens
    try:
        token_data = await discord.exchange_code(code)
        access_token = token_data.get("access_token")
    except Exception as e:
        logger.error(f"OAuth code exchange failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid authorization code")
        
    # 2. Get Discord User details
    try:
        discord_profile = await discord.get_user_info(access_token)
        discord_id = discord_profile.get("id")
        discord_username = discord_profile.get("username")
        discord_email = discord_profile.get("email")
        discord_avatar = discord_profile.get("avatar")
    except Exception as e:
        logger.error(f"Fetching Discord profile failed: {e}")
        raise HTTPException(status_code=400, detail="Failed to fetch user details from Discord")
        
    if not discord_email:
        raise HTTPException(status_code=400, detail="Discord account must have an associated email address")
        
    # 3. AntiVPN / Alt-account checks
    security_report = await run_login_security_checks(
        db=db,
        client_ip=client_ip,
        discord_id=discord_id,
        user_agent=request.headers.get("user-agent", "Unknown")
    )
    
    # 4. Find or Create local User
    user = db.query(User).filter(User.discord_id == discord_id).first()
    is_new_user = False
    
    if not user:
        is_new_user = True
        user = User(
            id=uuid.uuid4(),
            discord_id=discord_id,
            username=discord_username,
            email=discord_email,
            avatar=f"https://cdn.discordapp.com/avatars/{discord_id}/{discord_avatar}.png" if discord_avatar else None,
            coins=Decimal("10.00"),  # Startup bonus coins
            is_admin=False
        )
        db.add(user)
        db.flush() # Generate ID for relations
        
        # Credit startup bonus to ledger
        ledger = CoinLedger(
            user_id=user.id,
            amount=Decimal("10.00"),
            running_balance=Decimal("10.00"),
            type="grant",
            description="Welcome startup coins bonus"
        )
        db.add(ledger)
        logger.info(f"Registered new local user: {discord_username} ({discord_id})")
    else:
        # Update user profile if changed
        user.username = discord_username
        user.email = discord_email
        if discord_avatar:
            user.avatar = f"https://cdn.discordapp.com/avatars/{discord_id}/{discord_avatar}.png"

    # 4b. Apply referral reward if a code was provided with the OAuth callback
    referral_code = state or ref
    if referral_code:
        try:
            await apply_referral_code(db=db, referred_user=user, code=referral_code)
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Referral application failed for {discord_id}: {e}")
            
    # 5. Sync/Provision on Calagopus
    if not user.calagopus_uuid:
        # Check if the user already exists in Calagopus by searching their external ID
        calagopus_uuid = None
        calagopus_base_url = settings.CALAGOPUS_URL.rstrip("/")
        calagopus_timeout = httpx.Timeout(20.0, connect=5.0)
        headers = build_calagopus_headers()
        
        async with httpx.AsyncClient(timeout=calagopus_timeout) as client:
            try:
                # Retrieve by external ID
                ext_url = f"{calagopus_base_url}/api/admin/users/external/discord_{discord_id}"
                resp = await client.get(ext_url, headers=headers)
                if resp.status_code == 200:
                    user_data = resp.json()
                    calagopus_uuid = user_data.get("user", {}).get("uuid")
                    logger.info(f"Matched existing Calagopus user by external ID: {calagopus_uuid}")
                else:
                    # If not found by external ID, try searching by email
                    search_url = f"{calagopus_base_url}/api/admin/users?page=1&per_page=1&search={discord_email}"
                    resp = await client.get(search_url, headers=headers)
                    if resp.status_code == 200:
                        search_data = resp.json()
                        users_list = search_data.get("users", {}).get("data", [])
                        if users_list:
                            calagopus_uuid = users_list[0].get("uuid")
                            logger.info(f"Matched existing Calagopus user by email: {calagopus_uuid}")
                            
                            # Update their external ID on Calagopus side to link them permanently
                            patch_url = f"{calagopus_base_url}/api/admin/users/{calagopus_uuid}"
                            patch_payload = {"external_id": f"discord_{discord_id}"}
                            await client.patch(patch_url, json=patch_payload, headers=headers)
            except httpx.TimeoutException as e:
                logger.error(f"Calagopus lookup timed out against {calagopus_base_url}: {e}")
            except httpx.RequestError as e:
                logger.error(f"Calagopus lookup request error against {calagopus_base_url}: {e}")
                
        # If still not found, auto-create the Calagopus user
        if not calagopus_uuid:
            create_payload = {
                "username": discord_username[:30].replace(" ", "_").lower(), # Clean username rules
                "email": discord_email,
                "name_first": discord_username[:30],
                "name_last": "Discord",
                "admin": False,
                "language": "en",
                "external_id": f"discord_{discord_id}",
                "password": str(uuid.uuid4()) # Generate random secure password (dashboard uses OAuth)
            }
            async with httpx.AsyncClient(timeout=calagopus_timeout) as client:
                try:
                    resp = await client.post(f"{calagopus_base_url}/api/admin/users", json=create_payload, headers=headers)
                    if resp.status_code == 201 or resp.status_code == 200:
                        user_data = resp.json()
                        calagopus_uuid = user_data.get("user", {}).get("uuid")
                        logger.info(f"Provisioned new Calagopus user: {calagopus_uuid}")
                    else:
                        logger.error(f"Failed to create Calagopus user: {resp.status_code} - {resp.text}")
                        raise HTTPException(
                            status_code=502,
                            detail=f"Failed to sync account with game panel ({resp.status_code})"
                        )
                except HTTPException:
                    raise
                except httpx.TimeoutException as e:
                    logger.error(f"Calagopus creation timed out against {calagopus_base_url}: {e}")
                    raise HTTPException(status_code=504, detail="Game panel sync timed out")
                except httpx.RequestError as e:
                    logger.error(f"Calagopus creation request error against {calagopus_base_url}: {e}")
                    raise HTTPException(status_code=502, detail="Could not reach game panel")
                    
        # Update user with Calagopus UUID
        user.calagopus_uuid = calagopus_uuid
        
    # Write Audit Log
    log = AuditLog(
        user_id=user.id,
        action="registration" if is_new_user else "login",
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent", "Unknown"),
        details={
            "alt_flag": bool(security_report.duplicate_accounts),
            "vpn_detected": security_report.vpn_detected,
            "proxy_detected": security_report.proxy_detected,
            "tor_detected": security_report.tor_detected,
        }
    )
    db.add(log)
    db.commit()
    
    # 6. Generate access token and set HttpOnly cookie
    token = create_access_token(data={"sub": str(user.id)})

    # Redirect back to frontend (token will be in HttpOnly cookie, not URL)
    # This prevents token leakage to browser history, logs, CDN, referer headers
    frontend_redirect_url = f"{settings.FRONTEND_URL}/auth/callback"
    response = RedirectResponse(frontend_redirect_url)

    # Set HttpOnly, SameSite cookie (cannot be accessed by JavaScript)
    # secure=True only in production (HTTPS). In development (HTTP localhost),
    # secure must be False or the cookie will be rejected by the browser.
    is_production = not settings.BACKEND_PUBLIC_URL.startswith("http://localhost")
    response.set_cookie(
        key="access_token_cookie",
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,  # Prevent XSS access
        secure=is_production,  # Only send over HTTPS in production
        samesite="Lax"  # CSRF protection
    )
    return response

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the authenticated user's dashboard details.
    """
    return current_user
