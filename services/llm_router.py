import logging
import threading
import re
from typing import Any, Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

from config.settings import settings

logger = logging.getLogger(__name__)


def _build_client(provider_model: str) -> Optional[tuple[str, Any]]:
    """Parse 'provider:model' and build the LangChain client."""
    provider, _, model = provider_model.partition(":")

    if provider == "groq":
        if not settings.GROQ_API_KEY:
            return None
        return (provider_model, ChatGroq(model=model, api_key=settings.GROQ_API_KEY))

    if provider == "openrouter":
        if not settings.OPENROUTER_API_KEY:
            return None
        return (provider_model, ChatOpenAI(
            model=model,
            api_key=settings.OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
        ))

    if provider == "gemini":
        if not settings.GOOGLE_API_KEY:
            return None
        return (provider_model, ChatGoogleGenerativeAI(
            model=model,
            google_api_key=settings.GOOGLE_API_KEY,
        ))

    logger.warning("Unknown provider: %s", provider)
    return None


class PoolRouter:
    """
    Round robin router with bitfield availability tracking.

    Bitfield: each bit represents one model.
        1 = available
        0 = rate limited / failed

    Picking next model costs one bitwise AND — O(1).
    Adding models requires zero code changes — just update settings.
    """

    def __init__(self, model_strings: list[str]) -> None:
        built = [_build_client(m) for m in model_strings]
        self._models: list[tuple[str, Any]] = [b for b in built if b is not None]
        self._count = len(self._models)

        # Bitfield: all bits set to 1 (all models available)
        self._available: int = (1 << self._count) - 1
        self._counter: int = 0
        self._lock = threading.Lock()

    def _next_available(self, start: int) -> Optional[int]:
        """Find next available model index using bitwise scan."""
        for i in range(self._count):
            index = (start + i) % self._count
            if self._available & (1 << index):
                return index
        return None

    def _mark_unavailable(self, index: int) -> None:
        with self._lock:
            self._available &= ~(1 << index)
            logger.warning("Model %s marked unavailable (bit %d cleared)", self._models[index][0], index)

    def _mark_available(self, index: int) -> None:
        with self._lock:
            self._available |= (1 << index)

    def invoke(self, prompt: str) -> str:
        if not self._models:
            raise RuntimeError("No models configured in pool.")

        with self._lock:
            start = self._counter % self._count
            self._counter += 1

        index = self._next_available(start)

        if index is None:
            # All marked unavailable — reset bitfield and retry
            logger.warning("All models unavailable — resetting availability bitfield")
            with self._lock:
                self._available = (1 << self._count) - 1
            index = start

        for i in range(self._count):
            current = (index + i) % self._count
            name, model = self._models[current]

            try:
                logger.info("Trying model: %s", name)
                response = model.invoke(prompt)

                if response and getattr(response, "content", None):
                    logger.info("Success: %s", name)
                    return re.sub(r"<[^>]+>", "", str(response.content)).strip()

            except Exception as exc:
                logger.warning("%s failed: %s", name, exc)
                if "429" in str(exc) or "rate" in str(exc).lower():
                    self._mark_unavailable(current)
                continue

        return "system_overloaded_fallback"


def build_classify_pool() -> PoolRouter:
    return PoolRouter(settings.CLASSIFY_MODELS)


def build_extract_pool() -> PoolRouter:
    return PoolRouter(settings.EXTRACT_MODELS)


def build_generate_pool() -> PoolRouter:
    return PoolRouter(settings.GENERATE_MODELS)


class LLMRouter:
    """Backwards-compatible wrapper — uses classify pool by default."""

    def __init__(self, pool: Optional[PoolRouter] = None) -> None:
        self._pool = pool or build_classify_pool()

    def invoke(self, prompt: str) -> str:
        return self._pool.invoke(prompt)