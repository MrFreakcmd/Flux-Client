import uuid
from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey, Integer, BigInteger, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    discord_id = Column(String(64), unique=True, nullable=False, index=True)
    calagopus_uuid = Column(UUID(as_uuid=True), unique=True, nullable=True, index=True)
    username = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    avatar = Column(String(255), nullable=True)
    coins = Column(Numeric(12, 2), default=0.00, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    limit_cpu = Column(Integer, default=100, nullable=False)      # % (100 = 1 core)
    limit_memory = Column(Integer, default=2048, nullable=False)  # MB (2GB default)
    limit_disk = Column(Integer, default=10000, nullable=False)   # MB (10GB default)
    limit_slots = Column(Integer, default=2, nullable=False)      # 2 servers default
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    servers = relationship("Server", back_populates="owner", cascade="all, delete-orphan")
    ledger_entries = relationship("CoinLedger", back_populates="user", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="user", cascade="all, delete-orphan")

class CoinLedger(Base):
    __tablename__ = "coin_ledger"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    running_balance = Column(Numeric(12, 2), nullable=False)
    type = Column(String(50), nullable=False) # e.g. 'grant', 'purchase', 'referral', 'afk', 'p2p_transfer', 'topup'
    description = Column(Text, nullable=False)
    reference_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="ledger_entries")

class Server(Base):
    __tablename__ = "servers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    calagopus_uuid = Column(UUID(as_uuid=True), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    egg_uuid = Column(UUID(as_uuid=True), nullable=False)
    node_uuid = Column(UUID(as_uuid=True), nullable=False)
    cpu_limit = Column(Integer, nullable=False) # percentage (100 = 1 core)
    memory_limit = Column(Integer, nullable=False) # MB
    disk_limit = Column(Integer, nullable=False) # MB
    slots = Column(Integer, default=1, nullable=False)
    is_suspended = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="servers")

class Referral(Base):
    __tablename__ = "referrals"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    referrer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    referred_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    code = Column(String(50), nullable=False, index=True)
    reward_granted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Ticket(Base):
    __tablename__ = "tickets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    department = Column(String(100), nullable=False) # 'technical', 'billing', 'general'
    status = Column(String(50), default="open", nullable=False) # 'open', 'replied', 'closed'
    support_pin = Column(String(10), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="tickets")
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan")

class TicketMessage(Base):
    __tablename__ = "ticket_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    sender_type = Column(String(50), nullable=False) # 'user', 'admin', 'system'
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    ticket = relationship("Ticket", back_populates="messages")

class Announcement(Base):
    __tablename__ = "announcements"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(255), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    details = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class SystemSetting(Base):
    __tablename__ = "system_settings"
    
    key = Column(String(100), primary_key=True)
    value = Column(JSONB, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
