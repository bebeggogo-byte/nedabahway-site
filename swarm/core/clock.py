import os
from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9), name="KST")


def now():
    tz_name = os.environ.get("SWARM_TZ", "Asia/Seoul")
    if tz_name in ("Asia/Seoul", "KST"):
        return datetime.now(KST)
    return datetime.now(timezone.utc).astimezone()


def stamp():
    return now().strftime("%Y-%m-%d %H:%M KST")


def today():
    return now().strftime("%Y-%m-%d")
