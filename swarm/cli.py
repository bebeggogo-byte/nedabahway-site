"""Swarm CLI — dispatch one agent or one chained workflow.

Usage:
    python -m swarm.cli run <agent> [-i "..."] [--no-notebook]
    python -m swarm.cli list
    python -m swarm.cli describe <agent>
    python -m swarm.cli log [N]
    python -m swarm.cli note "free-form note to append to today's notebook"
    python -m swarm.cli oppose <agent_or_path>   # run the full opposing layer over a draft
    python -m swarm.cli publish                  # rebuild the public swarm/data/*.json
    python -m swarm.cli morning                  # daily routine: brief + publish

Environment:
    ANTHROPIC_API_KEY must be set, or a swarm/.env file present.
"""

import argparse
import json
import sys
from pathlib import Path

from dotenv import load_dotenv

from .core import log, notebook, runner
from .core.paths import ROOT


def _load_env() -> None:
    env_file = ROOT / ".env"
    if env_file.exists():
        load_dotenv(env_file)
    else:
        load_dotenv()


def _read_input(s: str | None) -> str:
    if not s:
        return ""
    p = Path(s)
    if p.is_file():
        return p.read_text(encoding="utf-8")
    return s


def cmd_list(_args):
    for name in runner.list_agents():
        spec = runner.describe(name)
        dept = spec["_department_meta"].get("name", spec["department"])
        print(f"  {name:24}  [{spec['department']:>5}]  {dept}")


def cmd_describe(args):
    spec = runner.describe(args.agent)
    print(f"Agent:        {args.agent}")
    print(f"Department:   {spec['department']} — {spec['_department_meta'].get('name')}")
    print(f"Layer:        {spec['_department_meta'].get('layer')}")
    print(f"Model:        {spec['model']}")
    print(f"Effort:       {spec.get('effort')}")
    print(f"Thinking:     {spec.get('thinking')}")
    print(f"Max tokens:   {spec.get('max_tokens')}")
    print()
    print("System:")
    print(spec["system"].rstrip())


def cmd_run(args):
    out = runner.run(args.agent, input_text=_read_input(args.input), with_notebook=not args.no_notebook)
    print(out["output"])


def cmd_note(args):
    notebook.append(args.text)
    print(f"Logged to {notebook.path_for()}")


def cmd_log(args):
    for record in log.read(limit=args.n):
        print(f"{record['ts']}  [{record['department']:>5}] {record['agent']:24}  {record['summary']}")


def cmd_oppose(args):
    """Push a draft through the entire opposing layer in order."""
    text = _read_input(args.target)
    chain = ["verify-claims", "fact-check", "market-check", "red-team", "rewrite-as-options", "trust-lint"]
    for agent in chain:
        print(f"\n========== {agent} ==========\n")
        out = runner.run(agent, input_text=text, with_notebook=False)
        print(out["output"])


def cmd_publish(_args):
    from . import publish
    publish.write_all()
    print(f"Wrote {publish.TODAY_JSON} and {publish.RECENT_JSON}")


def cmd_morning(_args):
    out = runner.run("morning-brief", input_text=_read_input(None) or "Plan the day.")
    print(out["output"])
    notebook.append("Morning brief:\n\n" + out["output"])
    cmd_publish(None)


def main(argv=None):
    _load_env()
    p = argparse.ArgumentParser(prog="swarm", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("list"); sp.set_defaults(func=cmd_list)

    sp = sub.add_parser("describe"); sp.add_argument("agent"); sp.set_defaults(func=cmd_describe)

    sp = sub.add_parser("run")
    sp.add_argument("agent")
    sp.add_argument("-i", "--input", help="Inline text or path to a file.")
    sp.add_argument("--no-notebook", action="store_true", help="Don't include notebook digest in context.")
    sp.set_defaults(func=cmd_run)

    sp = sub.add_parser("note"); sp.add_argument("text"); sp.set_defaults(func=cmd_note)

    sp = sub.add_parser("log"); sp.add_argument("n", type=int, nargs="?", default=20); sp.set_defaults(func=cmd_log)

    sp = sub.add_parser("oppose"); sp.add_argument("target", help="Inline text or path to a draft."); sp.set_defaults(func=cmd_oppose)

    sp = sub.add_parser("publish"); sp.set_defaults(func=cmd_publish)

    sp = sub.add_parser("morning"); sp.set_defaults(func=cmd_morning)

    args = p.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
