from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://genhealth_user:your_password_here@localhost:5432/genhealth_dev"
    SECRET_KEY: str = "default_secret_key_change_in_production"

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
