from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    OPENROUTER_API_KEY: Optional[str] = None
    # OPENROUTER_MODEL: str = "poolside/laguna-xs.2:free"
    GROQ_API_KEY: Optional[str] = None
    # GROQ_MODEL: str = "qwen/qwen3-32b"
    GOOGLE_API_KEY: Optional[str] = None
    # GEMINI_MODEL: str = "gemini-2.0-flash"
    GMAIL_CLIENT_ID: Optional[str] = None
    GMAIL_CLIENT_SECRET: Optional[str] = None
    GMAIL_REFRESH_TOKEN: Optional[str] = None
    GMAIL_SENDER_EMAIL: Optional[str] = None
    GMAIL_WATCH_TOPIC_NAME: Optional[str] = None
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    # Classification pool
    CLASSIFY_MODEL_1: str = "llama-3.3-70b-versatile"
    CLASSIFY_MODEL_2: str = "google/gemma-3-27b-it:free"
    CLASSIFY_MODEL_3: str = "gemini-2.0-flash-lite"

    # Extraction pool
    EXTRACT_MODEL_1: str = "deepseek/deepseek-r1-0528:free"
    EXTRACT_MODEL_2: str = "llama-3.3-70b-versatile"
    EXTRACT_MODEL_3: str = "gemini-2.0-flash"

    # Generation pool
    GENERATE_MODEL_1: str = "meta-llama/llama-3.3-70b-instruct:free"
    GENERATE_MODEL_2: str = "qwen/qwen3-32b"
    GENERATE_MODEL_3: str = "poolside/laguna-xs.2:free"

    @property
    def CLASSIFY_MODELS(self) -> list[str]:
        return [
            f"groq:{self.CLASSIFY_MODEL_1}",
            f"openrouter:{self.CLASSIFY_MODEL_2}",
            f"gemini:{self.CLASSIFY_MODEL_3}",
        ]

    @property
    def EXTRACT_MODELS(self) -> list[str]:
        return [
            f"openrouter:{self.EXTRACT_MODEL_1}",
            f"groq:{self.EXTRACT_MODEL_2}",
            f"gemini:{self.EXTRACT_MODEL_3}",
        ]

    @property
    def GENERATE_MODELS(self) -> list[str]:
        return [
            f"openrouter:{self.GENERATE_MODEL_1}",
            f"groq:{self.GENERATE_MODEL_2}",
            f"openrouter:{self.GENERATE_MODEL_3}",
        ]




settings = Settings()