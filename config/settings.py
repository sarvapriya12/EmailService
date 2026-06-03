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



settings = Settings()