from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://peblo:peblo@localhost:5432/peblo"
    storage_backend: str = "local"
    storage_local_path: str = "./storage"
    secret_key: str = "change-me"


settings = Settings()
