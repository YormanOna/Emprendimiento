from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List, Union


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # APP
    APP_NAME: str = "Cuidado Adulto Mayor API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # API
    API_V1_PREFIX: str = "/api/v1"

    # DATABASE
    DATABASE_URL: str

    # SECURITY
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_HASH_SCHEME: str = "bcrypt"

    # CORS / WS (en env pueden venir como "*" o como lista separada por comas)
    CORS_ALLOW_ORIGINS: Union[str, List[str]] = "*"
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: Union[str, List[str]] = "*"
    CORS_ALLOW_HEADERS: Union[str, List[str]] = "*"

    WS_ALLOW_ORIGINS: Union[str, List[str]] = "*"

    # REPORTS
    REPORTS_DIR: str = "generated_reports"

    @field_validator("CORS_ALLOW_ORIGINS", "CORS_ALLOW_METHODS", "CORS_ALLOW_HEADERS", "WS_ALLOW_ORIGINS")
    @classmethod
    def parse_csv_or_star(cls, v):
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            s = v.strip()
            if s == "*":
                return "*"
            # "a,b,c" -> ["a","b","c"]
            return [item.strip() for item in s.split(",") if item.strip()]
        return v


settings = Settings()
