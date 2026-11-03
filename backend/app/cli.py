from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

from app.config import get_settings
from app.db import init_db, make_engine, make_session_factory, session_scope
from app.ingestion.csv_feed import load_csv_feed
from app.ingestion.fetch import HttpClient
from app.ingestion.pipeline import _replace_observations, run_refresh
from app.scoring.engine import refresh_scores
from app.scoring.validation import compute_validation, write_validation
from app.static_export import export_static


def _print(payload) -> None:
    print(json.dumps(payload, indent=2, default=str))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="US market valuation dashboard operations")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init-db", help="Create database tables")

    refresh = sub.add_parser("refresh", help="Fetch data and recompute scores")
    refresh.add_argument("--no-breadth", action="store_true", help="Skip constituent breadth download")
    refresh.add_argument("--validate", action="store_true", help="Also write validation results")

    sub.add_parser("score", help="Recompute scores from stored observations")
    sub.add_parser("validate", help="Compute forward-return validation from stored data")

    export = sub.add_parser("export-static", help="Write static JSON snapshots for a static site")
    export.add_argument("--out", default="../frontend/public/data", help="Output directory")

    import_csv = sub.add_parser("import-csv", help="Import an authorized indicator CSV")
    import_csv.add_argument("--indicator", choices=["forward_pe", "fear_greed"], required=True)
    import_csv.add_argument("--file", required=True)
    import_csv.add_argument("--earnings-basis", default=None)
    import_csv.add_argument("--skip-score", action="store_true")
    return parser


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    args = build_parser().parse_args()
    settings = get_settings()
    engine = make_engine(settings)
    init_db(engine)
    factory = make_session_factory(engine)

    if args.command == "init-db":
        _print({"status": "ok", "database": settings.database_url.split("@")[-1]})
        return 0

    if args.command == "refresh":
        with session_scope(factory) as session:
            result = run_refresh(
                session,
                settings,
                include_breadth=not args.no_breadth,
                run_validation=args.validate,
            )
            _print(result)
        return 0

    if args.command == "score":
        with session_scope(factory) as session:
            _print(refresh_scores(session, settings))
        return 0

    if args.command == "validate":
        with session_scope(factory) as session:
            payload = compute_validation(session, settings)
            path = write_validation(payload, settings)
            _print({"status": "ok", "path": str(path), "n_scores": payload["n_scores"]})
        return 0

    if args.command == "export-static":
        with session_scope(factory) as session:
            _print(export_static(session, settings, Path(args.out)))
        return 0

    if args.command == "import-csv":
        label = (
            "Licensed forward P/E CSV"
            if args.indicator == "forward_pe"
            else "Authorized Fear & Greed CSV"
        )
        with HttpClient(settings) as client, session_scope(factory) as session:
            result = load_csv_feed(
                settings,
                client,
                args.indicator,
                args.file,
                label,
                args.earnings_basis or settings.forward_pe_earnings_basis,
            )
            stored = _replace_observations(session, args.indicator, result.observations)
            session.commit()
            score_result = None if args.skip_score else refresh_scores(session, settings)
            _print(
                {
                    "status": result.status,
                    "indicator": args.indicator,
                    "rows": stored,
                    "message": result.message,
                    "scores": score_result,
                }
            )
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
