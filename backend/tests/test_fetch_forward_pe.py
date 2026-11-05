import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from fetch_forward_pe import parse_forward_pe  # noqa: E402


@pytest.mark.parametrize(
    "text,expected",
    [
        # pypdf sometimes splits digits and hyphens: "2 1.5" == 21.5, "12 -month"
        ("The forward 12 -month P/E ratio for the S&P 500 is 2 1.5. This P/E ratio is above the 5 -year average (19.7)", 21.5),
        ("The forward 12 -month P/E ratio for the S&P 500 is 2 2.2. above the 5 -year average (19.7)", 22.2),
        ("The forward 12 -month P/E ratio for the S&P 500 is 2 0.7. This P/E", 20.7),
        # clean extraction still works
        ("The forward 12-month P/E ratio for the S&P 500 is 21.5. This P/E ratio is above the 5-year average (19.7)", 21.5),
        ("forward 12-month P/E ratio is 9.8. ok", 9.8),
    ],
)
def test_parse_forward_pe(text, expected):
    assert parse_forward_pe(text) == expected


def test_parse_forward_pe_missing():
    assert parse_forward_pe("no valuation sentence here") is None
