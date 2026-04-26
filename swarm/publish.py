"""Publish swarm activity to the static site.

Writes two files into swarm/data/:
  today.json   — the current daily strip (chips + posture + headline)
  recent.json  — last 30 activity entries for the public dashboard

Both are read by /swarm.html and the today-strip block of /index.html.
"""

import json
from collections import OrderedDict

from .core import log, runner
from .core.clock import now, stamp
from .core.paths import RECENT_JSON, TODAY_JSON


def _today_chips(activity: list[dict]) -> list[str]:
    today = now().date().isoformat()
    chips = OrderedDict()
    for entry in activity:
        if entry["ts"][:10] != today:
            continue
        chips.setdefault(entry["department"], None)
    return list(chips.keys()) or ["Chief"]


def _strip_payload() -> dict:
    activity = log.read()
    today = now().date().isoformat()
    todays_activity = [a for a in activity if a["ts"][:10] == today]
    if not todays_activity:
        return {
            "headline": "The desk is quiet.",
            "stamp": stamp(),
            "chips": [],
            "posture": "No agent has reported in yet today.",
        }
    chips = _today_chips(activity)
    headline = f"Today at the desk — {now().strftime('%B %-d')} · {now().strftime('%H:%M')} KST"
    return {
        "headline": headline,
        "stamp": stamp(),
        "chips": chips,
        "posture": "Today the desk is open.",
    }


def write_all() -> None:
    TODAY_JSON.write_text(json.dumps(_strip_payload(), ensure_ascii=False, indent=2), encoding="utf-8")

    activity = log.read(limit=30)
    public = []
    for entry in activity:
        spec = runner.describe(entry["agent"]) if entry["agent"] in runner.list_agents() else {}
        meta = spec.get("_department_meta", {}) if spec else {}
        public.append({
            "ts": entry["ts"],
            "department": entry["department"],
            "department_name": meta.get("name", entry["department"]),
            "layer": meta.get("layer", "production"),
            "agent": entry["agent"],
            "summary": entry["summary"],
        })
    RECENT_JSON.write_text(json.dumps(public, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    write_all()
