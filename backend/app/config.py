from __future__ import annotations

import hashlib
import json
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.indicators import CATEGORY_ORDER, INDICATORS

BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WEIGHTS_PATH = BACKEND_ROOT / "config" / "weights.json"


class WeightsFile(BaseModel):
    version: str
    overall: dict[str, float]
    fundamental: dict[str, float]
    relative: dict[str, float]
    sentiment: dict[str, float]
    breadth: dict[str, float]
    thresholds: dict[str, float]
    windows: dict
    staleness_days: dict[str, int]
    availability_lag_days: dict[str, int]
    minimum_coverage: float = 0.6
    minimum_categories: int = 2

    @model_validator(mode="after")
    def validate_weights(self) -> WeightsFile:
        category_maps = {
            "fundamental": self.fundamental,
            "relative": self.relative,
            "sentiment": self.sentiment,
            "breadth": self.breadth,
        }
        if set(self.overall) != set(CATEGORY_ORDER):
            raise ValueError(f"overall weights must cover exactly {CATEGORY_ORDER}")
        _require_sum(self.overall, 1.0, "overall")
        for category, mapping in category_maps.items():
            if not mapping:
                raise ValueError(f"{category} weights are empty")
            _require_sum(mapping, 1.0, category)
            for indicator_id in mapping:
                if indicator_id not in INDICATORS:
                    raise ValueError(f"unknown indicator in weights: {indicator_id}")
                if INDICATORS[indicator_id].category != category:
                    raise ValueError(f"{indicator_id} is not in category {category}")
        weighted_ids = {key for mapping in category_maps.values() for key in mapping}
        if weighted_ids != set(INDICATORS):
            missing = set(INDICATORS) - weighted_ids
            raise ValueError(f"indicators missing from weights: {sorted(missing)}")
        ordered = [
            self.thresholds.get("very_overvalued"),
            self.thresholds.get("overvalued"),
            self.thresholds.get("neutral"),
            self.thresholds.get("undervalued"),
        ]
        if any(value is None for value in ordered) or ordered != sorted(ordered):
            raise ValueError("valuation thresholds must be present and ascending")
        if not 0 <= self.minimum_coverage <= 1:
            raise ValueError("minimum_coverage must be between 0 and 1")
        if not 1 <= self.minimum_categories <= 4:
            raise ValueError("minimum_categories must be between 1 and 4")
        for indicator_id in INDICATORS:
            if indicator_id not in self.staleness_days:
                raise ValueError(f"missing staleness_days for {indicator_id}")
            if indicator_id not in self.availability_lag_days:
                raise ValueError(f"missing availability_lag_days for {indicator_id}")
        return self

    @property
    def category_maps(self) -> dict[str, dict[str, float]]:
        return {
            "fundamental": self.fundamental,
            "relative": self.relative,
            "sentiment": self.sentiment,
            "breadth": self.breadth,
        }

    def weight_for(self, indicator_id: str) -> float:
        category = INDICATORS[indicator_id].category
        return self.category_maps[category].get(indicator_id, 0.0)

    def window_years(self, indicator_id: str) -> int:
        return int(self.windows.get("default_years", 20))

    def min_observations(self, indicator_id: str) -> int:
        return int(self.windows.get("minimum_observations", {}).get(indicator_id, 252))

    def staleness(self, indicator_id: str) -> int:
        return int(self.staleness_days[indicator_id])

    def availability_lag(self, indicator_id: str) -> int:
        return int(self.availability_lag_days[indicator_id])

    def canonical_json(self) -> str:
        payload = self.model_dump(mode="json")
        return json.dumps(payload, sort_keys=True, separators=(",", ":"))

    @property
    def hash(self) -> str:
        return hashlib.sha256(self.canonical_json().encode("utf-8")).hexdigest()[:16]


def _require_sum(mapping: dict[str, float], expected: float, label: str) -> None:
    total = sum(float(value) for value in mapping.values())
    if abs(total - expected) > 1e-6:
        raise ValueError(f"{label} weights must sum to {expected}, got {total}")


@lru_cache(maxsize=8)
def load_weights(path: str | Path | None = None) -> WeightsFile:
    target = Path(path) if path else DEFAULT_WEIGHTS_PATH
    if not target.exists():
        raise FileNotFoundError(f"weights file not found: {target}")
    return WeightsFile.model_validate_json(target.read_text(encoding="utf-8"))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "US Market Valuation Dashboard"
    environment: str = "development"
    database_url: str = "sqlite:///./data/valuation.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    weights_path: str = str(DEFAULT_WEIGHTS_PATH)

    shiller_index_url: str = "https://shillerdata.com/"
    shiller_fallback_url: str = (
        "https://img1.wsimg.com/blobby/go/e5e77e0b-59d1-44d9-ab25-4763ac982e53/"
        "downloads/1449043e-a1ed-4e2e-8e9c-7b9a2a064493/ie_data.xls"
    )
    cboe_vix_url: str = "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv"
    treasury_base_url: str = (
        "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/"
        "daily-treasury-rates.csv"
    )
    worldbank_url: str = (
        "https://api.worldbank.org/v2/country/USA/indicator/CM.MKT.LCAP.GD.ZS"
    )
    constituents_url: str = (
        "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv"
    )
    yahoo_chart_url: str = "https://query1.finance.yahoo.com/v8/finance/chart"

    forward_pe_csv_url: str | None = None
    forward_pe_earnings_basis: str = "operating"
    fear_greed_csv_url: str | None = None
    # Daily NASDAQ-100 trailing P/E snapshots (date,value[,source]) written by
    # scripts/fetch_nasdaq_pe.py. Feeds the NASDAQ equity risk premium.
    nasdaq_pe_csv_url: str | None = None
    allow_unofficial_price_feed: bool = True
    erp_method: str = "auto"

    breadth_enabled: bool = True
    breadth_history_years: int = 6
    breadth_max_tickers: int = 503
    breadth_chunk_size: int = 100
    breadth_min_constituents: int = 400
    # NASDAQ-100 breadth. With no URL the bundled app/data/nasdaq100_constituents.csv is used.
    nasdaq_constituents_url: str | None = None
    nasdaq_max_tickers: int = 110
    nasdaq_breadth_min_constituents: int = 80

    score_start_year: int = 1990
    request_timeout_seconds: float = 45.0
    request_retries: int = 3
    user_agent: str = "MarketValuationDashboard/1.0 (research use)"
    refresh_token: str | None = None
    validation_output_path: str = str(BACKEND_ROOT / "app" / "data" / "validation.json")

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            value = value.replace("postgres://", "postgresql+psycopg://", 1)
        elif value.startswith("postgresql://") and "+psycopg" not in value:
            value = value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @field_validator("erp_method")
    @classmethod
    def validate_erp_method(cls, value: str) -> str:
        if value not in {"auto", "forward", "trailing"}:
            raise ValueError("erp_method must be auto, forward, or trailing")
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def weights(self) -> WeightsFile:
        return load_weights(self.weights_path)

    @property
    def sqlite_path(self) -> Path | None:
        if not self.database_url.startswith("sqlite:///"):
            return None
        raw = self.database_url.removeprefix("sqlite:///")
        return Path(raw)


@lru_cache(maxsize=4)
def get_settings() -> Settings:
    return Settings()
