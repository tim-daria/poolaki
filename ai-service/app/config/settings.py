from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    llm_base_url: str
    llm_model: str
    llm_fallback_model: str
    llm_api_key: str
    llm_timeout: float = 30.0

    django_base_url: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
