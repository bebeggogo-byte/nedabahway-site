from .clock import today, stamp
from .paths import NOTEBOOK_DIR


def path_for(date_str: str | None = None):
    return NOTEBOOK_DIR / f"{date_str or today()}.md"


def append(text: str) -> None:
    p = path_for()
    header = f"# {today()}\n\n" if not p.exists() else ""
    with p.open("a", encoding="utf-8") as f:
        if header:
            f.write(header)
        f.write(f"\n## {stamp()}\n\n{text.strip()}\n")


def digest(days: int = 3, max_chars: int = 6000) -> str:
    files = sorted(NOTEBOOK_DIR.glob("*.md"), reverse=True)[:days]
    chunks = []
    for f in files:
        chunks.append(f.read_text(encoding="utf-8"))
    joined = "\n\n---\n\n".join(chunks)
    if len(joined) > max_chars:
        joined = joined[-max_chars:]
    return joined or "(notebook is empty)"
