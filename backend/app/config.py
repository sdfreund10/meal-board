from __future__ import annotations

from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = (
        "postgresql://mealboard:mealboard@localhost:5432/mealboard_development"
    )
    api_prefix: str = "/api"
    cors_origins: List[str] = ["http://localhost:5173"]
    household_pin: str = "1234"
    admin_password: str = "admin"
    session_secret: str
    session_https_only: bool = False

    @field_validator("session_secret")
    @classmethod
    def session_secret_must_be_strong(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("SESSION_SECRET must be at least 32 characters")
        return value

    @field_validator("cors_origins")
    @classmethod
    def cors_origins_must_be_explicit(cls, value: List[str]) -> List[str]:
        if "*" in value:
            raise ValueError(
                "CORS_ORIGINS cannot include '*' when credentials are enabled"
            )
        return value


settings = Settings()
