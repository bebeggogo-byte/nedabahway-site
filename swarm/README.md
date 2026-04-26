# The Swarm

A homemade swarm of small AI agents for a one-person education company on Jeju Island.

Sixty agents, seventeen departments, one operator. **Six of the agents exist only to attack the work of the other fifty-four.** That second group is the *opposing layer* — the central idea of the essay [Eight Hours With My AI Swarm](https://www.nedabah.org/blog/posts/2026-04-19_eight-hours-with-my-ai-swarm.html), made into running code.

This is intentionally a small Python project, not a framework. Each agent is a tight prompt with one job. The system runs on cron and writes its activity to a JSON file the static site reads.

## What is in this folder

```
swarm/
├── config/
│   ├── departments.yaml   17 departments + Chief
│   └── agents.yaml        the agents and their prompts
├── core/
│   ├── client.py          Anthropic client
│   ├── runner.py          loads YAML, builds the request, calls Claude, logs the run
│   ├── log.py             append-only JSONL activity log
│   ├── notebook.py        daily Markdown notebook (private; gitignored)
│   ├── clock.py           KST-aware time helpers
│   └── paths.py           where everything lives
├── data/                  PUBLIC. today.json + recent.json (committed, served by GitHub Pages)
├── log/                   PRIVATE. activity log (gitignored)
├── notebook/              PRIVATE. daily markdown (gitignored)
├── cli.py                 entry point — `python -m swarm.cli ...`
├── publish.py             rebuilds the public JSON from the activity log
├── cron.example           sample crontab
├── requirements.txt
└── .env.example
```

## One-time setup

```sh
cd swarm
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# put your ANTHROPIC_API_KEY in .env
```

## Daily use

```sh
# from the repo root
python -m swarm.cli list                            # show every agent
python -m swarm.cli describe red-team               # see the prompt and config
python -m swarm.cli run morning-brief -i "Plan."    # dispatch one agent
python -m swarm.cli note "Met with Seogwipo client" # append to today's notebook
python -m swarm.cli oppose draft.md                 # push a draft through the opposing layer
python -m swarm.cli log 20                          # last 20 actions
python -m swarm.cli publish                         # regenerate /swarm/data/*.json
python -m swarm.cli morning                         # = brief + log to notebook + publish
```

The morning routine is what runs on cron — see `cron.example`.

## What gets published

`publish.py` writes two files into `swarm/data/` (committed to the repo):

- `today.json` — the strip the homepage shows: headline, KST stamp, department chips, a one-line posture.
- `recent.json` — the last 30 actions for the public dashboard at `/swarm.html`.

Neither file ever contains the full output of an agent. The `summary` is the first 140 characters of the first line. Drafts, client names, and the daily notebook stay on the operator's machine.

## The opposing layer

Six departments exist to attack work, not to produce it. They are the difference between AI advice and AI advice you can act on.

| Code | Department          | Job                                                                                          |
|------|---------------------|----------------------------------------------------------------------------------------------|
| D8   | Verification        | For each claim, attach evidence or label it UNVERIFIED.                                      |
| D9   | Market Intelligence | Refuse vibes as data. Report what is known; the rest is UNKNOWN.                             |
| D10  | Red Team            | Find the failure modes a friendly reader would miss.                                         |
| D11  | Fact Check          | Reverify every number, date, and cited precedent.                                            |
| D12  | Decision Architect  | Rewrite a recommendation as 2–3 options with FACT/ESTIMATE/OPINION labels.                   |
| D13  | Trust Officer       | Final linter. Flag over-confidence, hope-projection, and self-referential loops.             |

The single command `python -m swarm.cli oppose <draft>` pushes a draft through all six in order.

## Models

Every agent uses Claude Opus 4.7 with adaptive thinking by default. You can downshift any agent in `config/agents.yaml` — set `model: claude-sonnet-4-6` (or `claude-haiku-4-5`) and `effort: low` to cut cost. The opposing layer benefits most from staying on Opus.

## Privacy

What stays on your machine: drafts, the daily notebook, the full activity log, anything you paste into an agent.

What gets committed and served publicly: only `swarm/data/today.json` and `swarm/data/recent.json` — chip codes, timestamps, agent names, and 140-char first-line summaries. No personal names, no client names, no full outputs.

If a summary line is going to embarrass you in public, edit `core/log.py:append` to redact further before writing.
