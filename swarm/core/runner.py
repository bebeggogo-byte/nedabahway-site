import yaml
from functools import lru_cache

from . import client, log, notebook
from .paths import CONFIG_DIR


@lru_cache(maxsize=1)
def _config():
    agents = yaml.safe_load((CONFIG_DIR / "agents.yaml").read_text(encoding="utf-8"))
    departments = yaml.safe_load((CONFIG_DIR / "departments.yaml").read_text(encoding="utf-8"))
    return agents, departments


def list_agents() -> list[str]:
    agents, _ = _config()
    return sorted(agents.get("agents", {}).keys())


def describe(name: str) -> dict:
    agents, departments = _config()
    spec = agents["agents"][name]
    defaults = agents.get("defaults", {})
    merged = {**defaults, **spec}
    dept_code = merged["department"]
    merged["_department_meta"] = departments.get(dept_code, {"name": dept_code})
    return merged


def _build_request(spec: dict, user_text: str) -> dict:
    model = spec["model"]
    system_blocks = [{
        "type": "text",
        "text": spec["system"].strip(),
        "cache_control": {"type": "ephemeral"},
    }]
    req: dict = {
        "model": model,
        "max_tokens": int(spec.get("max_tokens", 8000)),
        "system": system_blocks,
        "messages": [{"role": "user", "content": user_text}],
    }
    thinking = spec.get("thinking", "adaptive")
    output_config: dict = {}
    effort = spec.get("effort")
    if effort:
        output_config["effort"] = effort
    if thinking == "adaptive":
        req["thinking"] = {"type": "adaptive"}
    elif thinking == "off":
        req["thinking"] = {"type": "disabled"}
    if output_config:
        req["output_config"] = output_config
    return req


def run(name: str, *, input_text: str = "", with_notebook: bool = True) -> dict:
    spec = describe(name)
    context = notebook.digest() if with_notebook else ""
    user_text = spec["prompt"].format(input=input_text or "(none)", context=context or "(none)")

    req = _build_request(spec, user_text)
    response = client.get().messages.create(**req)

    text_parts = []
    for block in response.content:
        if block.type == "text":
            text_parts.append(block.text)
    output = "".join(text_parts).strip()

    dept_code = spec["department"]
    summary_line = output.splitlines()[0][:140] if output else "(no output)"
    log.append(
        department=dept_code,
        agent=name,
        summary=summary_line,
        tokens={
            "input": response.usage.input_tokens,
            "output": response.usage.output_tokens,
            "cache_read": getattr(response.usage, "cache_read_input_tokens", 0),
            "cache_create": getattr(response.usage, "cache_creation_input_tokens", 0),
        },
    )

    return {
        "agent": name,
        "department": dept_code,
        "department_name": spec["_department_meta"].get("name", dept_code),
        "output": output,
        "stop_reason": response.stop_reason,
    }
