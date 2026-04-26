import os
from functools import lru_cache


@lru_cache(maxsize=1)
def get():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set. Copy swarm/.env.example to swarm/.env and fill it in."
        )
    from anthropic import Anthropic
    return Anthropic(api_key=api_key)
