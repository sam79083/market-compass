from __future__ import annotations

import logging
from collections.abc import Callable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import router
from app.config import Settings, get_settings
from app.db import init_db, make_engine, make_session_factory

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings or get_settings()
    engine = make_engine(resolved)
    init_db(engine)
    session_factory = make_session_factory(engine)

    is_production = resolved.environment.lower() == "production"
    app = FastAPI(
        # Interactive docs are only exposed outside production.
        docs_url=None if is_production else "/docs",
        redoc_url=None if is_production else "/redoc",
        openapi_url=None if is_production else "/openapi.json",
        title=resolved.app_name,
        description=(
            "Historical relative-attractiveness dashboard for U.S. equities. "
            "Research tooling, not investment advice."
        ),
        version="1.0.0",
    )
    app.state.settings = resolved
    app.state.engine = engine
    app.state.session_factory = session_factory

    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "OPTIONS"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def cache_headers(request: Request, call_next: Callable):
        response = await call_next(request)
        if request.method == "GET" and response.status_code == 200:
            path = request.url.path
            if path == "/api/dashboard":
                response.headers["Cache-Control"] = "public, max-age=60"
            elif path.startswith("/api/"):
                response.headers["Cache-Control"] = "public, max-age=300"
        return response

    @app.exception_handler(Exception)
    async def unhandled_exception(_request: Request, exc: Exception):
        logging.getLogger(__name__).exception("Unhandled API error")
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    app.include_router(router)

    @app.get("/")
    def root():
        payload = {
            "name": resolved.app_name,
            "health": "/api/health",
            "dashboard": "/api/dashboard",
        }
        if not is_production:
            payload["docs"] = "/docs"
        return payload

    return app


app = create_app()
