from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    # LLM Providers
    OPENROUTER_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    NVIDIA_API_KEY: Optional[str] = None
    

    # Gmail
    GMAIL_CLIENT_ID: Optional[str] = None
    GMAIL_CLIENT_SECRET: Optional[str] = None
    GMAIL_REFRESH_TOKEN: Optional[str] = None
    GMAIL_SENDER_EMAIL: Optional[str] = None
    GMAIL_WATCH_TOPIC_NAME: Optional[str] = None

    # Supabase
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None



    ALLOWED_ORIGINS: str = ""

    @property
    def allowed_origins(self) -> List[str]:
        return [
            origin.strip()
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]



    @property
    def CLASSIFY_MODELS(self) -> list[str]:
        """
        Sentiment analysis
        Intent detection
        Priority classification
        Email categorization
        """
        return [
            "groq:qwen/qwen3-32b",
            "gemini:gemini-2.5-flash",
            "nvidia:meta/llama-3.3-70b-instruct",
            "openrouter:microsoft/mai-ds-r1:free",
        ]
    @property
    def EXTRACT_MODELS(self) -> list[str]:
        return [
            "groq:qwen/qwen3-32b",
            "gemini:gemini-2.5-flash",
            "nvidia:meta/llama-3.3-70b-instruct",
            "openrouter:microsoft/mai-ds-r1:free",
        ]


    @property
    def GENERATE_MODELS(self) -> list[str]:
        return [
            "gemini:gemini-2.5-flash",
            "groq:qwen/qwen3-32b",
            "nvidia:meta/llama-3.3-70b-instruct",
            "openrouter:microsoft/mai-ds-r1:free",
        ]

settings = Settings()