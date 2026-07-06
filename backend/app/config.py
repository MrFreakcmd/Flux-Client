from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # App Settings
    SECRET_KEY: str = Field(default="supersecretkeyhereforjwt")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Database Settings
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "flux_client"
    
    @property
    def DATABASE_URL(self) -> str:
        # We will use SQLAlchemy 2.0+ which supports psycopg (v3)
        return f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        
    # Redis Settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    # Calagopus Settings
    CALAGOPUS_URL: str = "https://panel.freakcloud.tk"
    CALAGOPUS_API_KEY: str = "your_admin_api_key"

    # Frontend / public URLs
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_PUBLIC_URL: str = "http://localhost:8000"
    
    # Discord OAuth Settings
    DISCORD_CLIENT_ID: str = ""
    DISCORD_CLIENT_SECRET: str = ""
    DISCORD_REDIRECT_URI: str = "https://dash.freakcloud.tk/api/auth/callback"
    
    # Security/Anti-VPN (Optional, e.g. vpnapi.io)
    VPNAPI_KEY: str = ""
    
    # SSLCommerz Settings
    SSLCOMMERZ_STORE_ID: str = ""
    SSLCOMMERZ_STORE_PASSWORD: str = ""
    SSLCOMMERZ_IS_SANDBOX: bool = True

    # Product economics
    AFK_REWARD_PER_HEARTBEAT: float = 1.0
    REFERRAL_REWARD_COINS: float = 5.0
    DRIFT_SYNC_INTERVAL_SECONDS: int = 900
    GIFT_MIN_COINS: float = 1.0
    SERVER_RENEWAL_COST: float = 10.0
    SERVER_RENEWAL_DAYS: int = 30
    CODE_REDEEM_MAX_LENGTH: int = 64
    JOIN_REWARD_COINS: float = 5.0
    DISCORD_REWARD_GUILD_ID: str = ""
    DISCORD_BOT_TOKEN: str = ""
    LINK_REWARD_PROVIDERS: str = ""
    LINK_REWARD_COINS: float = 1.0
    IMAGE_UPLOAD_DIR: str = "uploads"
    IMAGE_UPLOAD_MAX_MB: int = 8
    
    # Mail Settings (SMTP)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@freakcloud.tk"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
