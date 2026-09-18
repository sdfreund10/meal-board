from __future__ import annotations

from enum import Enum
from typing import List

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppEnv(str, Enum):
    development = "development"
    production = "production"
    test = "test"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    database_url: str = "postgresql://mealboard:mealboard@localhost:5432/mealboard_development"

    api_prefix: str = "/api"
    cors_origins: List[str] = ["http://localhost:5173"]

    openrouter_api_key: str = ""
    household_pin: str = "1234"
    admin_password: str = "admin"
    session_secret: str
    session_https_only: bool = False

    def is_production(self) -> bool:
        return self.app_env == AppEnv.production

    def is_test(self) -> bool:
        return self.app_env == AppEnv.test

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

    @field_validator("app_env")
    @classmethod
    def valid_app_env(cls, value: str) -> AppEnv:
        if value not in AppEnv.__members__:
            raise ValueError(f"Invalid app environment: {value}")
        return AppEnv(value)

    @model_validator(mode="after")
    def valid_openrouter_api_key(self) -> str:
        if not self.openrouter_api_key and not self.is_test():
            raise ValueError("OPENROUTER_API_KEY is required")
        return self

    @model_validator(mode="after")
    def validate_production(self) -> Settings:
        if self.app_env != AppEnv.production:
            return self

        errors: list[str] = []
        if self.household_pin in {"", "1234"}:
            errors.append("HOUSEHOLD_PIN must be a strong non-default value")
        if self.admin_password in {"", "admin"} or len(self.admin_password) < 10:
            errors.append("ADMIN_PASSWORD must be a strong non-default value")
        if not self.session_https_only:
            errors.append("SESSION_HTTPS_ONLY must be true")
        if any(not o.startswith("https://") for o in self.cors_origins):
            errors.append("CORS_ORIGINS must be HTTPS in production")
        if "mealboard:mealboard@" in self.database_url:
            errors.append("DATABASE_URL must not use default credentials")
        if not self.openrouter_api_key:
            errors.append("OPENROUTER_API_KEY is required")

        if errors:
            raise ValueError("; ".join(errors))
        return self


settings = Settings()
