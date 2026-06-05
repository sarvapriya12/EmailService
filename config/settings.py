from typing import Optional
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
    DEEPSEEK_API_KEY: Optional[str] = None
    NVIDIA_API_KEY: Optional[str] = None
    MOONSHOT_API_KEY: Optional[str] = None

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
            "deepseek:deepseek-chat",
            "gemini:gemini-2.5-flash",
            "nvidia:meta/llama-3.3-70b-instruct",
            "openrouter:qwen/qwen3-32b:free",
        ]

    @property
    def EXTRACT_MODELS(self) -> list[str]:
        """
        JSON extraction
        Structured data extraction
        Entity extraction
        """
        return [
            "deepseek:deepseek-chat",
            "groq:qwen/qwen3-32b",
            "gemini:gemini-2.5-flash",
            "nvidia:meta/llama-3.3-70b-instruct",
            "openrouter:deepseek/deepseek-chat-v3:free",
        ]

    @property
    def GENERATE_MODELS(self) -> list[str]:
        """
        Customer replies
        Email drafting
        Summaries
        Professional responses
        """
        return [
            "gemini:gemini-2.5-flash",
            "moonshot:kimi-k2",
            "deepseek:deepseek-chat",
            "groq:qwen/qwen3-32b",
            "nvidia:meta/llama-3.3-70b-instruct",
        ]


settings = Settings()