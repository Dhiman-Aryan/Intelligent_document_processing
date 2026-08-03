from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central place for every environment-driven value. Nothing in the
    rest of the app reads os.environ directly — that keeps every
    config value discoverable in one file and easy to override per
    environment (local / staging / production) via a .env file.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App ---
    app_name: str = "DocIntel API"
    environment: str = "development"
    # Comma-separated, same convention as admin_emails below — lets a
    # second origin (e.g. the Mac's LAN IP, for viewing the site from
    # a phone on the same Wi-Fi) be added without touching code, just
    # this one env var.
    frontend_origins: str = "http://localhost:3000"

    @property
    def frontend_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]

    # --- Auth ---
    # Auto-generated on first run if not set — fine for local dev, but
    # set a fixed JWT_SECRET_KEY in production so tokens survive a restart.
    jwt_secret_key: str = "dev-only-change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24 * 7  # 7 days

    # --- Local user database (separate from Databricks — just accounts) ---
    # Points at a local MongoDB by default (brew services / mongod running
    # on the default port) — no auth needed for local dev. Point this at a
    # MongoDB Atlas connection string in production instead.
    mongodb_uri: str = "mongodb://localhost:27017"
    # "Connection name" as far as MongoDB itself is concerned — passed to
    # the driver as appName, so this app's connections are identifiable
    # by name in mongod's logs / db.currentOp() instead of just showing
    # up as an anonymous connection.
    mongodb_app_name: str = "Intelligent Project"
    mongodb_db_name: str = "Intelligent_Database"
    mongodb_users_collection: str = "Authentication"
    mongodb_uploads_collection: str = "Uploads"

    # --- Roles ---
    # Comma-separated list of emails treated as admin. There's no
    # "role" field stored per-account in MongoDB on purpose — role is
    # derived from this list on every request, so granting/revoking
    # admin is a one-line .env edit, not a database write.
    admin_emails: str = ""

    @property
    def admin_email_set(self) -> set[str]:
        return {email.strip().lower() for email in self.admin_emails.split(",") if email.strip()}

    # --- Databricks ---
    # Left blank until the user fills in Settings → Databricks connection
    # (or sets these as real environment variables). Every Databricks call
    # checks is_databricks_configured first and falls back to mock data
    # otherwise, so the API is fully usable before this is set up.
    databricks_host: str | None = None
    databricks_token: str | None = None
    databricks_http_path: str | None = None  # SQL warehouse HTTP path
    databricks_catalog: str = "cdac-project"
    databricks_volume_path: str = "/Volumes/cdac-project/intelligent-main-folder/raw"
    databricks_job_id: str | None = None  # Job that runs the 6-notebook pipeline

    @property
    def is_databricks_configured(self) -> bool:
        return bool(self.databricks_host and self.databricks_token and self.databricks_http_path)

    # --- Claude API (instant-preview image extraction) ---
    # Replaces the earlier local Ollama/qwen2.5vl setup — that ran fine on
    # a proper machine but made this specific 8GB M1 Mac hang under load,
    # so extraction for image uploads now calls the Claude API instead.
    anthropic_api_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
