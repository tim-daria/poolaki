#Set-up the LLM config

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    opencode_api_key: str
    opencode_model: str = "gpt-4o-mini"
    django_base_url: str
    llm_timeout: float = 30.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()