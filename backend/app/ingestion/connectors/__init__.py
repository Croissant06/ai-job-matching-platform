from app.ingestion.base import Connector
from app.ingestion.connectors.adzuna import AdzunaConnector
from app.ingestion.connectors.jooble import JoobleConnector
from app.ingestion.connectors.zaplata_bg import ZaplataConnector

# jobs.bg is intentionally absent: it serves HTTP 403 to non-browser clients
# (active anti-bot). Working around that would create the exact legal/technical
# risk the spec says to avoid; its ads partially arrive via Jooble instead.
ALL_CONNECTORS: list[Connector] = [
    AdzunaConnector(),
    JoobleConnector(),
    ZaplataConnector(),
]


def get_connectors(names: list[str] | None = None) -> list[Connector]:
    if not names:
        return ALL_CONNECTORS
    wanted = {n.lower() for n in names}
    matched = [c for c in ALL_CONNECTORS if c.name.lower() in wanted]
    unknown = wanted - {c.name.lower() for c in matched}
    if unknown:
        raise ValueError(f"Unknown source(s): {', '.join(sorted(unknown))}. "
                         f"Available: {', '.join(c.name for c in ALL_CONNECTORS)}")
    return matched
