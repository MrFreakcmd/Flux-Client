from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID
from decimal import Decimal

class UserBase(BaseModel):
    username: str
    email: str
    avatar: Optional[str] = None

class UserOut(UserBase):
    id: UUID
    discord_id: str
    calagopus_uuid: Optional[UUID] = None
    coins: Decimal
    is_admin: bool
    limit_cpu: int
    limit_memory: int
    limit_disk: int
    limit_slots: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

class ServerBase(BaseModel):
    name: str

class ServerCreate(ServerBase):
    egg_uuid: UUID
    node_uuid: UUID
    cpu_limit: int = Field(..., ge=10, le=800) # CPU in % (e.g. 100 = 1 core)
    memory_limit: int = Field(..., ge=128, le=32768) # RAM in MB
    disk_limit: int = Field(..., ge=512, le=1048576) # Disk in MB
    slots: int = Field(default=1, ge=1, le=10)

class ServerOut(BaseModel):
    id: UUID
    user_id: UUID
    calagopus_uuid: UUID
    name: str
    egg_uuid: UUID
    node_uuid: UUID
    cpu_limit: int
    memory_limit: int
    disk_limit: int
    slots: int
    is_suspended: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CoinLedgerOut(BaseModel):
    id: int
    amount: Decimal
    running_balance: Decimal
    type: str
    description: str
    reference_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class StoreUpgradeRequest(BaseModel):
    server_uuid: UUID
    cpu_delta: int = 0      # % to add
    memory_delta: int = 0   # MB to add
    disk_delta: int = 0     # MB to add
    slots_delta: int = 0    # slots to add

class CoinTransferRequest(BaseModel):
    recipient_discord_id: str
    amount: Decimal = Field(..., gt=0)

class TicketMessageCreate(BaseModel):
    message: str


class TicketReplyCreate(BaseModel):
    message: str
    support_pin: Optional[str] = None

class TicketMessageOut(BaseModel):
    id: UUID
    sender_id: Optional[UUID] = None
    sender_type: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True

class TicketCreate(BaseModel):
    subject: str
    department: str # 'technical', 'billing', 'general'
    message: str


class SupportPinVerificationRequest(BaseModel):
    support_pin: str

class TicketOut(BaseModel):
    id: UUID
    user_id: UUID
    subject: str
    department: str
    status: str
    support_pin: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    messages: List[TicketMessageOut] = Field(default_factory=list)

    class Config:
        from_attributes = True

class AnnouncementOut(BaseModel):
    id: UUID
    title: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogOut(BaseModel):
    id: int
    action: str
    ip_address: Optional[str] = None
    details: Optional[Any] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SecurityCheckRequest(BaseModel):
    discord_id: Optional[str] = None
    client_ip: Optional[str] = None
    user_agent: Optional[str] = None


class SecurityCheckOut(BaseModel):
    client_ip: str
    vpn_detected: bool = False
    proxy_detected: bool = False
    tor_detected: bool = False
    duplicate_accounts: List[str] = Field(default_factory=list)
    blocked: bool = False
    notes: List[str] = Field(default_factory=list)


class ReferralApplyRequest(BaseModel):
    code: str


class ReferralOut(BaseModel):
    id: UUID
    referrer_id: UUID
    referred_id: UUID
    code: str
    reward_granted: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AFKHeartbeatOut(BaseModel):
    credited: bool
    reward: Decimal = Decimal("0")
    elapsed_seconds: Optional[float] = None
    next_eligible_in: Optional[float] = None
    balance: Decimal
    message: str


class BillingSessionRequest(BaseModel):
    amount: Decimal = Field(..., gt=0)
    currency: str = "BDT"
    product_category: str = "top up"
    description: Optional[str] = None


class BillingSessionOut(BaseModel):
    tran_id: str
    gateway_url: str
    amount: Decimal
    currency: str
    description: Optional[str] = None


class BillingWebhookPayload(BaseModel):
    val_id: Optional[str] = None
    tran_id: Optional[str] = None
    status: Optional[str] = None
    amount: Optional[Decimal] = None
    verify_sign: Optional[str] = None
    verify_key: Optional[str] = None


class AccountUpdateRequest(BaseModel):
    username: Optional[str] = Field(default=None, min_length=2, max_length=80)
    avatar: Optional[str] = Field(default=None, max_length=500)


class ApiKeyCreateRequest(BaseModel):
    name: str = Field(default="Default key", min_length=1, max_length=100)


class GiftCoinsRequest(BaseModel):
    recipient_id: UUID
    amount: Decimal = Field(..., gt=0)
    note: Optional[str] = Field(default=None, max_length=200)


class RedeemCodeRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=64)


class ImageSettingsRequest(BaseModel):
    enabled: bool = True
    embed_enabled: bool = False
    embed_title: Optional[str] = Field(default=None, max_length=255)
    embed_description: Optional[str] = Field(default=None, max_length=2000)
    embed_color: Optional[str] = Field(default=None, max_length=16)


class ServerUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    cpu_limit: Optional[int] = Field(default=None, ge=10, le=800)
    memory_limit: Optional[int] = Field(default=None, ge=128, le=32768)
    disk_limit: Optional[int] = Field(default=None, ge=512, le=1048576)
    slots: Optional[int] = Field(default=None, ge=1, le=10)
