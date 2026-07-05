import httpx
from app.config import settings
import logging

logger = logging.getLogger(__name__)

async def exchange_code(code: str) -> dict:
    """
    Exchanges the Discord OAuth2 code for an access token.
    """
    url = "https://discord.com/api/v10/oauth2/token"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {
        "client_id": settings.DISCORD_CLIENT_ID,
        "client_secret": settings.DISCORD_CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.DISCORD_REDIRECT_URI
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, data=data, headers=headers)
        if resp.status_code != 200:
            logger.error(f"Discord token exchange failed: {resp.text}")
            raise RuntimeError("Failed to exchange authorization code with Discord")
        return resp.json()

async def get_user_info(access_token: str) -> dict:
    """
    Fetches the authorized user's profile details.
    """
    url = "https://discord.com/api/v10/users/@me"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            logger.error(f"Discord profile fetch failed: {resp.text}")
            raise RuntimeError("Failed to fetch user profile from Discord")
        return resp.json()

async def check_guild_membership(user_discord_id: str, guild_id: str, bot_token: str) -> bool:
    """
    Checks if a user is a member of the specific guild using a Discord bot token.
    """
    url = f"https://discord.com/api/v10/guilds/{guild_id}/members/{user_discord_id}"
    headers = {"Authorization": f"Bot {bot_token}"}
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        # 200 OK means they are a member. 404 Not Found means they are not.
        return resp.status_code == 200
