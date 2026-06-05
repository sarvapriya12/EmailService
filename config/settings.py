from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    OPENROUTER_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    GMAIL_CLIENT_ID: Optional[str] = None
    GMAIL_CLIENT_SECRET: Optional[str] = None
    GMAIL_REFRESH_TOKEN: Optional[str] = None
    GMAIL_SENDER_EMAIL: Optional[str] = None
    GMAIL_WATCH_TOPIC_NAME: Optional[str] = None
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None

    @property
    def CLASSIFY_MODELS(self) -> list[str]:
        return [
            "groq:llama-3.3-70b-versatile",
            "openrouter:mistralai/mistral-7b-instruct:free",
            "gemini:gemini-2.0-flash-lite",
        ]

    @property
    def EXTRACT_MODELS(self) -> list[str]:
        return [
            "openrouter:deepseek/deepseek-r1-0528:free",
            "groq:llama-3.3-70b-versatile",
            "gemini:gemini-2.0-flash",
        ]

    @property
    def GENERATE_MODELS(self) -> list[str]:
        return [
            "openrouter:meta-llama/llama-3.3-70b-instruct:free",
            "groq:qwen/qwen3-32b",
            "openrouter:poolside/laguna-xs.2:free",
        ]

settings = Settings()