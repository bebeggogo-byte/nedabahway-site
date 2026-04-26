from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE_ROOT = ROOT.parent
CONFIG_DIR = ROOT / "config"
LOG_DIR = ROOT / "log"
NOTEBOOK_DIR = ROOT / "notebook"
DATA_DIR = SITE_ROOT / "swarm" / "data"

for d in (LOG_DIR, NOTEBOOK_DIR, DATA_DIR):
    d.mkdir(parents=True, exist_ok=True)

ACTIVITY_LOG = LOG_DIR / "activity.jsonl"
TODAY_JSON = DATA_DIR / "today.json"
RECENT_JSON = DATA_DIR / "recent.json"
