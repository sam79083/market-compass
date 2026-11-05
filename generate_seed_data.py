"""Generate realistic seed data for Market Compass dashboard."""
import json
import random
import datetime
from pathlib import Path

random.seed(42)

end = datetime.date(2026, 10, 31)

# All weekdays
d = datetime.date(2018, 1, 3)
dates = []
while d <= end:
    if d.weekday() < 5:
        dates.append(d)
    d += datetime.timedelta(days=1)

# S&P 500 anchor prices (historically approximate)
sp500_anchors = [
    (datetime.date(2018, 1, 3), 2700),
    (datetime.date(2018, 12, 24), 2500),
    (datetime.date(2019, 1, 3), 2550),
    (datetime.date(2019, 7, 1), 2900),
    (datetime.date(2019, 12, 31), 3231),
    (datetime.date(2020, 2, 19), 3300),
    (datetime.date(2020, 3, 23), 2191),
    (datetime.date(2020, 4, 21), 2769),
    (datetime.date(2020, 12, 31), 3756),
    (datetime.date(2021, 12, 31), 4766),
    (datetime.date(2022, 6, 16), 3882),
    (datetime.date(2022, 10, 12), 3522),
    (datetime.date(2022, 12, 30), 3852),
    (datetime.date(2023, 5, 31), 4179),
    (datetime.date(2023, 12, 29), 4769),
    (datetime.date(2024, 6, 28), 5460),
    (datetime.date(2024, 11, 1), 5762),
    (datetime.date(2025, 1, 3), 5864),
    (datetime.date(2025, 7, 1), 6060),
    (datetime.date(2026, 10, 31), 6350),
]
sorted_a = sorted(sp500_anchors)
sp500 = {}
for idx in range(len(sorted_a) - 1):
    d0, p0 = sorted_a[idx]
    d1, p1 = sorted_a[idx + 1]
    n = (d1 - d0).days
    for j in range(n):
        dt = d0 + datetime.timedelta(days=j)
        if dt > end:
            break
        if dt in dates:
            sp500[dt] = p0 + (p1 - p0) * (j / n) + random.uniform(-2, 2)
if sorted_a[-1][0] in dates:
    sp500[sorted_a[-1][0]] = sorted_a[-1][1]

# --- Buffett indicator (annual) ---
buffett_history = [
    (datetime.date(2018, 12, 31), 180.0),
    (datetime.date(2020, 12, 31), 195.0),
    (datetime.date(2022, 12, 31), 155.0),
    (datetime.date(2023, 12, 31), 168.0),
    (datetime.date(2024, 12, 31), 180.0),
    (datetime.date(2026, 10, 31), 195.0),
]

# --- CAPE (monthly approximations) ---
cape_history = [
    (datetime.date(2018, 1, 31), 33.0),
    (datetime.date(2018, 6, 30), 32.0),
    (datetime.date(2018, 12, 31), 31.0),
    (datetime.date(2019, 6, 30), 33.0),
    (datetime.date(2019, 12, 31), 34.0),
    (datetime.date(2020, 3, 31), 28.0),
    (datetime.date(2020, 12, 31), 37.0),
    (datetime.date(2021, 6, 30), 38.0),
    (datetime.date(2021, 12, 31), 39.0),
    (datetime.date(2022, 6, 30), 33.0),
    (datetime.date(2022, 12, 31), 32.0),
    (datetime.date(2023, 6, 30), 33.5),
    (datetime.date(2023, 12, 31), 34.5),
    (datetime.date(2024, 6, 30), 36.0),
    (datetime.date(2024, 12, 31), 37.5),
    (datetime.date(2025, 6, 30), 38.5),
    (datetime.date(2025, 12, 31), 39.0),
    (datetime.date(2026, 6, 30), 40.0),
    (datetime.date(2026, 10, 31), 41.0),
]

# --- Treasury yields (monthly anchors) ---
treasury_anchors = [
    (datetime.date(2018, 4, 1), 2.8),
    (datetime.date(2018, 10, 1), 2.9),
    (datetime.date(2019, 4, 1), 2.3),
    (datetime.date(2019, 10, 1), 1.6),
    (datetime.date(2020, 1, 1), 1.8),
    (datetime.date(2020, 3, 20), 0.3),
    (datetime.date(2020, 7, 1), 0.5),
    (datetime.date(2020, 12, 1), 0.8),
    (datetime.date(2021, 4, 1), 1.6),
    (datetime.date(2021, 9, 1), 1.3),
    (datetime.date(2022, 1, 1), 1.7),
    (datetime.date(2022, 6, 1), 2.9),
    (datetime.date(2022, 10, 1), 4.0),
    (datetime.date(2022, 12, 1), 3.6),
    (datetime.date(2023, 2, 1), 3.7),
    (datetime.date(2023, 7, 1), 3.5),
    (datetime.date(2023, 10, 1), 4.8),
    (datetime.date(2023, 12, 1), 4.2),
    (datetime.date(2024, 3, 1), 4.2),
    (datetime.date(2024, 6, 1), 4.4),
    (datetime.date(2024, 9, 1), 3.8),
    (datetime.date(2024, 11, 1), 4.3),
    (datetime.date(2025, 3, 1), 4.1),
    (datetime.date(2025, 7, 1), 3.9),
    (datetime.date(2025, 10, 1), 3.9),
    (datetime.date(2026, 3, 1), 3.6),
    (datetime.date(2026, 7, 1), 3.4),
    (datetime.date(2026, 10, 1), 3.3),
]
sorted_treas = sorted(treasury_anchors)

obs = []

# S&P 500, RSP, SPY daily
for dt in dates:
    v_sp500 = sp500.get(dt, 0)
    if v_sp500 > 2100:
        obs.append({
            "indicator_id": "sp500_price",
            "period_date": dt.isoformat(),
            "effective_date": dt.isoformat(),
            "value": v_sp500,
            "is_estimate": False,
            "source": "historical_seed",
            "meta": {"symbol": "^GSPC"},
        })
        obs.append({
            "indicator_id": "rsp",
            "period_date": dt.isoformat(),
            "effective_date": dt.isoformat(),
            "value": sp500.get(dt, 0) * 0.97 + random.uniform(-10, 10),
            "is_estimate": False,
            "source": "historical_seed",
            "meta": {"symbol": "RSP"},
        })
        obs.append({
            "indicator_id": "spy",
            "period_date": dt.isoformat(),
            "effective_date": dt.isoformat(),
            "value": sp500.get(dt, 0) * 0.998 + random.uniform(-5, 5),
            "is_estimate": False,
            "source": "historical_seed",
            "meta": {"symbol": "SPY"},
        })

# VIX daily
for dt in dates:
    if dt == datetime.date(2020, 3, 23):
        v = 82.0
    elif datetime.date(2020, 3, 16) <= dt <= datetime.date(2020, 3, 30):
        v = 55.0
    elif datetime.date(2020, 3, 1) <= dt <= datetime.date(2020, 3, 31):
        v = 35.0
    elif dt.year == 2020:
        v = 25.0
    elif dt.year == 2022:
        v = 22.0
    else:
        v = 17.0 + random.uniform(-6, 12)
    obs.append({
        "indicator_id": "vix",
        "period_date": dt.isoformat(),
        "effective_date": dt.isoformat(),
        "value": round(v, 2),
        "is_estimate": False,
        "source": "historical_seed",
        "meta": {},
    })

# Treasury daily
for dt in dates:
    yld = 3.0
    for idx in range(len(sorted_treas)):
        if idx == len(sorted_treas) - 1:
            if dt >= sorted_treas[-1][0]:
                yld = sorted_treas[-1][1]
            break
        a, b = sorted_treas[idx]
        c, d_val = sorted_treas[idx + 1]
        if a <= dt <= c:
            frac = (dt - a).days / (c - a).days
            yld = b + (d_val - b) * frac
            break
    obs.append({
        "indicator_id": "treasury_10y",
        "period_date": dt.isoformat(),
        "effective_date": dt.isoformat(),
        "value": round(yld, 4),
        "is_estimate": False,
        "source": "historical_seed",
        "meta": {},
    })

# CAPE monthly
for month_date, cape_val in cape_history:
    obs.append({
        "indicator_id": "cape",
        "period_date": month_date.isoformat(),
        "effective_date": month_date.isoformat(),
        "value": float(cape_val),
        "is_estimate": False,
        "source": "historical_seed",
        "meta": {},
    })

# Buffett annual
for buff_date, buff_val in buffett_history:
    eff = buff_date + datetime.timedelta(days=270)
    obs.append({
        "indicator_id": "buffett",
        "period_date": buff_date.isoformat(),
        "effective_date": eff.isoformat(),
        "value": float(buff_val),
        "is_estimate": False,
        "source": "historical_seed",
        "meta": {"market_cap_definition": "listed domestic companies", "gdp_definition": "nominal GDP"},
    })

result = {
    "observations": obs,
    "generated_at": "2026-10-31",
    "n_observations": len(obs),
    "indicators": list(set(o["indicator_id"] for o in obs)),
}

Path("data/seeds.json").parent.mkdir(parents=True, exist_ok=True)
Path("data/seeds.json").write_text(json.dumps(result, default=str))
print(f"OK: {len(obs)} observations for {list(set(o['indicator_id'] for o in obs))}")
