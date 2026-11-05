import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from fetch_fear_greed import merge_rows, parse_history  # noqa: E402


def test_parse_history_filters_and_dedupes():
    payload = {
        "fear_and_greed_historical": {
            "data": [
                {"x": 1594684800000, "y": 45.123, "rating": "fear"},  # 2020-07-14
                {"x": 1594771200000, "y": 150},  # out of range -> dropped
                {"x": "bad", "y": 10},  # malformed -> dropped
                {"x": 1594771200000, "y": 52.0},  # 2020-07-15
                {"x": 1594774800000, "y": 53.5},  # same day, later point wins
            ]
        }
    }
    assert parse_history(payload) == {"2020-07-14": 45.12, "2020-07-15": 53.5}


def test_parse_history_empty():
    assert parse_history({}) == {}


def test_merge_rows_roundtrip(tmp_path):
    out = tmp_path / "fg.csv"
    assert merge_rows(out, {"2024-01-02": 40.0, "2024-01-03": 41.0}) == 2
    assert merge_rows(out, {"2024-01-03": 42.0, "2024-01-04": 43.0}) == 1
    lines = out.read_text().splitlines()
    assert lines[0] == "date,value,release_date"
    assert lines[1:] == [
        "2024-01-02,40.00,2024-01-02",
        "2024-01-03,42.00,2024-01-03",
        "2024-01-04,43.00,2024-01-04",
    ]
