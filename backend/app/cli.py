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
from app.models import CompositeScore, ComponentScore, IngestRun, Observation
from app.scoring.engine import refresh_scores
from app.scoring.validation import compute_validation, write_validation
from app.static_export import export_static


def _print(payload) -> None:
    print(json.dumps(payload, indent=2, default=str))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="US market valuation dashboard operations")
    sub = parser.add_subparsers(dest="command", required=True)

    init_db_p = sub.add_parser("init-db", help="Create database tables")
    init_db_p.add_argument("--seed", action="store_true", help="Also load fresh seed data from free APIs")

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

    seeds = sub.add_parser("seed-data", help="Manage seed data: generate or load")
    seeds_sub = seeds.add_subparsers(dest="action", required=True)
    seeds_sub.add_parser("generate", help="Download free public data and save as seed JSON")
    seeds_g = seeds_sub.add_parser("load", help="Load seed data from a JSON file")
    seeds_g.add_argument("--file", required=True, help="Path to seed JSON file")

    return parser


def _database_is_empty(factory) -> bool:
    engine = factory.bind
    from sqlalchemy import text
    with engine.connect() as conn:
        tables = conn.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='observations'"
            )
        ).fetchall()
        if not tables:
            return True
        count = conn.execute(
            text("SELECT COUNT(*) FROM observations")
        ).scalar()
        return count == 0


def _load_seed_observation_rows(session, observations_data: list[dict]) -> int:
    """Insert observation rows from seed data and return count."""
    rows = []
    for d in observations_data:
        rows.append(Observation(
            indicator_id=d["indicator_id"],
            period_date=d["period_date"],
            effective_date=d["effective_date"],
            value=float(d["value"]),
            is_estimate=bool(d.get("is_estimate", False)),
            source=str(d.get("source", "seed")),
            meta=dict(d.get("meta", {})),
        ))
    session.add_all(rows)
    session.flush()
    return len(rows)


def _load_seed_scores(session) -> dict:
    """Recompute all scores after seed data has been loaded."""
    from app.config import get_settings
    settings = get_settings()
    return refresh_scores(session, settings)


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
        # Check if database is empty and auto-seed if --seed flag is set
        if args.seed and _database_is_empty(factory):
            _print({"status": "init", "database": settings.database_url.split("@")[-1], "seed": "generating..."})
            import logging
            from app.seeds.generate_seeds import generate_seeds
            generate_seeds()
            with session_scope(factory) as session:
                with Path("data/seeds.json").open("r") as f:
                    seed_data = json.load(f)
                if seed_data.get("observations"):
                    count = _load_seed_observation_rows(session, seed_data["observations"])
                    session.commit()
                    scores = _load_seed_scores(session)
                    _print({
                        "status": "ok",
                        "database": settings.database_url.split("@")[-1],
                        "seed": "loaded",
                        "observations": count,
                        "scores": scores,
                    })
                else:
                    _print({"status": "ok", "database": settings.database_url.split("@")[-1], "seed": "no_data"})
            return 0
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

    if args.command == "seed-data":
        if args.action == "generate":
            from app.seeds.generate_seeds import generate_seeds
            result = generate_seeds(out_path="data/seeds.json")
            _print(result)
            return 0
        if args.action == "load":
            seed_path = Path(args.file)
            if not seed_path.exists():
                _print({"status": "error", "message": f"Seed file not found: {seed_path}"})
                return 1
            with session_scope(factory) as session:
                with seed_path.open("r") as f:
                    seed_data = json.load(f)
                if seed_data.get("observations"):
                    count = _load_seed_observation_rows(session, seed_data["observations"])
                    session.commit()
                    scores = _load_seed_scores(session)
                    _print({
                        "status": "ok",
                        "seed": "loaded",
                        "observations": count,
                        "scores": scores,
                    })
                else:
                    _print({"status": "ok", "seed": "empty"})
            return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
