"""NASDAQ-100 breadth: constituent loading and the 200-day computation."""

from __future__ import annotations

import sys
import types

import numpy as np
import pandas as pd
import pytest

from app.config import Settings
from app.ingestion import breadth
from app.ingestion.breadth import NASDAQ100_SEED_PATH, fetch_nasdaq_breadth


class _Client:
    def __init__(self, text: str | None = None, fail: bool = False):
        self.text, self.fail, self.urls = text, fail, []

    def get_text(self, url: str) -> str:
        self.urls.append(url)
        if self.fail:
            raise RuntimeError("boom")
        return self.text or ""


def test_bundled_nasdaq100_list_is_usable():
    frame = pd.read_csv(NASDAQ100_SEED_PATH)
    assert list(frame.columns) == ["Symbol"]
    assert 95 <= len(frame) <= 105
    assert frame["Symbol"].is_unique
    assert {"AAPL", "MSFT", "NVDA"} <= set(frame["Symbol"])


def test_constituents_default_to_bundled_list():
    client = _Client()
    symbols = breadth._load_nasdaq_constituents(Settings(), client)
    assert "AAPL" in symbols and client.urls == []


def test_constituent_url_wins_and_falls_back_to_bundled_list_on_failure():
    settings = Settings(nasdaq_constituents_url="https://example.test/n100.csv")
    assert breadth._load_nasdaq_constituents(settings, _Client("Symbol\nBRK.B\nZZZ\n")) == [
        "BRK-B",
        "ZZZ",
    ]
    assert "AAPL" in breadth._load_nasdaq_constituents(settings, _Client(fail=True))


@pytest.fixture()
def fake_yfinance(monkeypatch):
    """Ten symbols: five rising steadily (above their 200dma), five falling (below)."""
    days = pd.bdate_range("2023-01-02", periods=260)

    def download(symbols, **_):
        columns = {}
        for i, symbol in enumerate(symbols):
            slope = 1.0 if i % 2 == 0 else -1.0
            columns[symbol] = 200.0 + slope * np.arange(len(days)) * 0.3
        return pd.concat({"Close": pd.DataFrame(columns, index=days)}, axis=1)

    module = types.ModuleType("yfinance")
    module.download = download
    monkeypatch.setitem(sys.modules, "yfinance", module)
    return days


def test_nasdaq_breadth_series_and_ids(fake_yfinance, tmp_path):
    seed = tmp_path / "n100.csv"
    seed.write_text("Symbol\n" + "\n".join(f"T{i}" for i in range(10)) + "\n")
    settings = Settings(nasdaq_breadth_min_constituents=5)

    symbols = breadth._load_nasdaq_constituents(settings, _Client(), seed_path=seed)
    result = breadth._compute_breadth(
        settings, symbols, "nasdaq_breadth_200dma", "test", 5, "test bias"
    )

    assert result.ok and result.indicator_id == "nasdaq_breadth_200dma"
    obs = result.observations
    assert len(obs) == 260 - 199  # first valid 200-day window onward
    assert obs["value"].between(0, 100).all()
    assert obs["value"].iloc[-1] == pytest.approx(50.0)  # 5 of 10 above their average
    assert obs["meta"].iloc[-1]["constituents"] == 10


def test_nasdaq_breadth_respects_minimum_constituents(fake_yfinance):
    settings = Settings()  # default minimum is 80; only 10 symbols are available
    with pytest.raises(Exception, match="minimum constituent count"):
        breadth._compute_breadth(
            settings, [f"T{i}" for i in range(10)], "nasdaq_breadth_200dma", "t", 80, "b"
        )


def test_disabled_breadth_is_skipped():
    result = fetch_nasdaq_breadth(Settings(breadth_enabled=False), _Client())
    assert result.status == "skipped"
