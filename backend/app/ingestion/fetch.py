from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from app.config import Settings
from app.ingestion.base import SourceError

logger = logging.getLogger(__name__)


class HttpClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._client = httpx.Client(
            headers={"User-Agent": settings.user_agent},
            timeout=settings.request_timeout_seconds,
            follow_redirects=True,
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> HttpClient:
        return self

    def __exit__(self, *_args) -> None:
        self.close()

    def get(self, url: str, params: dict[str, Any] | None = None) -> httpx.Response:
        last_error: Exception | None = None
        for attempt in range(self.settings.request_retries):
            try:
                response = self._client.get(url, params=params)
                response.raise_for_status()
                return response
            except Exception as exc:
                last_error = exc
                logger.warning("request failed (%s/%s) %s: %s", attempt + 1, self.settings.request_retries, url, exc)
                if attempt + 1 < self.settings.request_retries:
                    time.sleep(min(2 ** attempt, 8))
        raise SourceError(f"request failed for {url}: {last_error}") from last_error

    def get_text(self, url: str, params: dict[str, Any] | None = None) -> str:
        return self.get(url, params=params).text

    def get_bytes(self, url: str, params: dict[str, Any] | None = None) -> bytes:
        return self.get(url, params=params).content

    def get_json(self, url: str, params: dict[str, Any] | None = None) -> Any:
        return self.get(url, params=params).json()
