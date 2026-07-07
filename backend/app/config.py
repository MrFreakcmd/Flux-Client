"""Application configuration using Pydantic settings with environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App Settings - CRITICAL: Must be provided via environment
    SECRET_KEY: str = Field(
        default=None,
        description="JWT secret key for signing access tokens. Min 32 chars."
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Database Settings - CRITICAL: Must be provided via environment
    POSTGRES_USER: str = Field(default=None, description="PostgreSQL user")
    POSTGRES_PASSWORD: str = Field(default=None, description="PostgreSQL password")
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "flux_client"

    @property
    def database_url(self) -> str:
        """SQLAlchemy connection string using psycopg v3."""
        return (
            f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Redis Settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # Calagopus Settings - CRITICAL: API key must be provided via environment
    CALAGOPUS_URL: str = Field(default="https://panel.freakcloud.tk")
    CALAGOPUS_API_KEY: str = Field(
        default=None, description="Calagopus admin API key"
    )

    # Frontend / public URLs
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_PUBLIC_URL: str = "http://localhost:8000"

    # CORS Settings - Comma-separated list, falls back to FRONTEND_URL
    CORS_ALLOWED_ORIGINS: str = Field(
        default=None, description="Comma-separated list of allowed CORS origins"
    )

    # Discord OAuth Settings - CRITICAL: Must be provided
    DISCORD_CLIENT_ID: str = Field(default=None, description="Discord OAuth ID")
    DISCORD_CLIENT_SECRET: str = Field(
        default=None, description="Discord OAuth secret"
    )
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

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    @field_validator("SECRET_KEY", mode="before")
    @classmethod
    def validate_secret_key(cls, v):
        """Validate SECRET_KEY is provided and at least 32 characters."""
        if v is None or (isinstance(v, str) and len(v.strip()) == 0):
            raise ValueError(
                "SECRET_KEY must be provided via environment variable and be "
                "at least 32 characters"
            )
        if len(v) < 32:
            raise ValueError(
                f"SECRET_KEY must be at least 32 characters long, got {len(v)}"
            )
        return v

    @field_validator("POSTGRES_USER", "POSTGRES_PASSWORD", mode="before")
    @classmethod
    def validate_db_credentials(cls, v, info):
        """Validate database credentials are provided."""
        field_name = info.field_name
        if v is None or (isinstance(v, str) and len(v.strip()) == 0):
            raise ValueError(
                f"{field_name} must be provided via environment variable"
            )
        return v

    @field_validator("DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", mode="before")
    @classmethod
    def validate_discord_creds(cls, v, info):
        """Validate Discord OAuth credentials are provided."""
        field_name = info.field_name
        if v is None or (isinstance(v, str) and len(v.strip()) == 0):
            raise ValueError(
                f"{field_name} must be provided via environment variable"
            )
        return v

    @field_validator("CALAGOPUS_API_KEY", mode="before")
    @classmethod
    def validate_calagopus_key(cls, v):
        """Validate Calagopus API key is provided."""
        if v is None or (isinstance(v, str) and len(v.strip()) == 0):
            raise ValueError(
                "CALAGOPUS_API_KEY must be provided via environment variable"
            )
        return v

    @property
    def get_cors_origins(self) -> list[str]:
        """Parse CORS_ALLOWED_ORIGINS or fallback to FRONTEND_URL."""
        if self.CORS_ALLOWED_ORIGINS:
            return [
                origin.strip()
                for origin in self.CORS_ALLOWED_ORIGINS.split(",")
                if origin.strip()
            ]
        return [self.FRONTEND_URL]


settings = Settings()
