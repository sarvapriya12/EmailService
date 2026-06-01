import logging
from typing import Any, Optional
import re
from urllib import response
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

from config.settings import settings


logger = logging.getLogger(__name__)


class LLMRouter:
    """Routes prompts through configured LLM providers."""

    def __init__(self) -> None:
        self.openrouter = self._build_provider(
            ChatOpenAI,
            model=settings.OPENROUTER_MODEL,
            api_key=settings.OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
        )
        self.groq = self._build_provider(
            ChatGroq,
            model=settings.GROQ_MODEL,
            api_key=settings.GROQ_API_KEY,
        )
        self.gemini = self._build_provider(
            ChatGoogleGenerativeAI,
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
        )

    def _build_provider(self, provider_cls: type[Any], **kwargs) -> Optional[Any]:
        if not any(kwargs.get(key) for key in ("api_key", "google_api_key")):
            return None
        return provider_cls(**kwargs)

    def invoke(self, prompt: str) -> str:
        providers = [
            ("OpenRouter", self.openrouter),
            ("Groq", self.groq),
            ("Gemini", self.gemini),
        ]

        for provider_name, provider in providers:
            if provider is None:
                logger.info("Skipping %s because it is not configured", provider_name)
                continue

            logger.info("Attempting provider: %s", provider_name)
            response = self._try_provider(provider, provider_name, prompt)

            if response:
                logger.info("Success using %s", provider_name)
                return response

        raise RuntimeError("All LLM providers failed.")

    def _try_provider(
        self,
        provider: Any,
        provider_name: str,
        prompt: str,
    ) -> Optional[str]:
        try:
            response = provider.invoke(prompt)
        except Exception as exc:
            logger.warning("%s failed: %s", provider_name, exc)
            return None

        if not response or not getattr(response, "content", None):
            return None

        # return str(response.content)
        # return str(response.content).replace("</assistant>", "").strip()
        return re.sub(r"<[^>]+>", "", str(response.content)).strip()

    def health_check(self) -> dict[str, str]:
        status: dict[str, str] = {}
        providers = {
            "openrouter": self.openrouter,
            "groq": self.groq,
            "gemini": self.gemini,
        }

        for name, provider in providers.items():
            if provider is None:
                status[name] = "unconfigured"
                continue

            try:
                provider.invoke("ping")
            except Exception:
                status[name] = "unhealthy"
            else:
                status[name] = "healthy"

        return status