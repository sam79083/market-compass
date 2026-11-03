from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

_global_db = Path(tempfile.mkdtemp(prefix="valuation-tests-")) / "global.db"
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_global_db.as_posix()}")
