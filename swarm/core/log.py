import json
from typing import Iterator

from .clock import now
from .paths import ACTIVITY_LOG


def append(department: str, agent: str, summary: str, tokens: dict | None = None) -> None:
    record = {
        "ts": now().isoformat(timespec="seconds"),
        "department": department,
        "agent": agent,
        "summary": summary,
    }
    if tokens:
        record["tokens"] = tokens
    with ACTIVITY_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def read(limit: int | None = None) -> list[dict]:
    if not ACTIVITY_LOG.exists():
        return []
    out = []
    with ACTIVITY_LOG.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    out.reverse()
    if limit is not None:
        out = out[:limit]
    return out


def stream_recent(limit: int = 30) -> Iterator[dict]:
    yield from read(limit)
