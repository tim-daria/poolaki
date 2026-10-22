#!/usr/bin/env python3
"""Summarize ai-service JSON logs into a markdown audit report."""

import json
import sys
from collections import Counter, defaultdict
from datetime import datetime
from statistics import mean

TRACE_MESSAGES = {
    "chat_completed",
    "retrieval_done",
    "intent_classified",
    "llm_final_done",
    "LLM response successful",
    "Embeddings generated successfully",
}


def parse_events(stream) -> list[dict]:
    events = []
    for raw in stream:
        line = raw.strip()
        if not line:
            continue
        if not line.startswith("{"):
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(event, dict):
            events.append(event)
    return events


def avg(values: list[float]) -> float | None:
    return mean(values) if values else None


def last(values: list[float]) -> float | None:
    return values[-1] if values else None


def num(value: float | None, unit: str = "") -> str:
    return "—" if value is None else f"{value:.2f}{unit}"


def short_ts(timestamp: str | None) -> str:
    try:
        return datetime.fromisoformat(timestamp).strftime("%H:%M:%S")
    except (TypeError, ValueError):
        return "—"


def table(headers: list[str], rows: list[list[object]]) -> str:
    if not rows:
        return "_No data._"
    lines = [
        "| " + " | ".join(headers) + " |",
        "|" + "|".join("---" for _ in headers) + "|",
    ]
    lines += ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join(lines)


def trace_detail(event: dict) -> str:
    message = event.get("message")
    if message == "chat_completed":
        return (
            f"intent={event.get('intent')}, "
            f"{event.get('latency_ms')} ms, "
            f"{event.get('total_tokens')} tokens"
        )
    if message == "retrieval_done":
        return (
            f"docs={len(event.get('doc_similarities') or [])}, "
            f"{event.get('retrieval_ms')} ms, "
            f"min_similarity={event.get('min_similarity')}"
        )
    if message == "intent_classified":
        return f"intent={event.get('intent')}, {event.get('intent_ms')} ms"
    if message == "llm_final_done":
        return f"{event.get('final_ms')} ms"
    if message == "LLM response successful":
        return (
            f"model={event.get('model')}, "
            f"attempt={event.get('attempt')}, "
            f"{event.get('duration')} s"
        )
    if message == "Embeddings generated successfully":
        return (
            f"model={event.get('model')}, "
            f"chunks={event.get('chunks_count')}, "
            f"tokens={event.get('prompt_tokens')}, "
            f"{event.get('duration')} s"
        )
    return ""


def build_report(events: list[dict]) -> str:
    chats = [e for e in events if e.get("message") == "chat_completed"]
    retrievals = [e for e in events if e.get("message") == "retrieval_done"]
    embeddings = [
        e for e in events if e.get("message") == "Embeddings generated successfully"
    ]
    llm_calls = [e for e in events if e.get("message") == "LLM response successful"]

    out = ["# AI service audit", ""]
    out += [
        f"Generated: {datetime.now().astimezone().strftime('%Y-%m-%d %H:%M:%S %Z')}",
        f"JSON events parsed: {len(events)}",
        "",
        "## Chat requests",
        "",
    ]

    chat_rows = []
    if chats:
        latencies = [float(e["latency_ms"]) for e in chats if "latency_ms" in e]
        tokens = [int(e.get("total_tokens", 0)) for e in chats]
        intents = Counter(str(e.get("intent")) for e in chats)
        chat_rows.append(
            [
                len(chats),
                num(avg(latencies)),
                sum(tokens),
                num(avg(tokens)),
                ", ".join(f"{name}={count}" for name, count in intents.items()),
            ]
        )
    out.append(table(["Requests", "Avg latency (ms)", "Total tokens", "Avg tokens", "Intents"], chat_rows))
    out.append("")

    out += ["## Token usage", ""]
    token_rows = [
        ["Intent classification", sum(int(e.get("intent_in", 0)) for e in chats), sum(int(e.get("intent_out", 0)) for e in chats)],
        ["Final answer", sum(int(e.get("final_in", 0)) for e in chats), sum(int(e.get("final_out", 0)) for e in chats)],
        ["Embeddings", "", sum(int(e.get("prompt_tokens", 0)) for e in embeddings)],
        ["Total reported (chat)", "", sum(int(e.get("total_tokens", 0)) for e in chats)],
    ]
    out.append(table(["Stage", "Input", "Output"], token_rows))
    out.append("")
    out.append(
        "Embedding tokens come from embedding events; "
        "they are not included in the reported chat total."
    )
    out.append("")

    out += ["## LLM calls", ""]
    llm_stats: dict[str, dict] = defaultdict(lambda: {"calls": 0, "retries": 0, "durations": []})
    for event in llm_calls:
        stat = llm_stats[event.get("model", "unknown")]
        stat["calls"] += 1
        stat["retries"] += int(event.get("attempt", 1) > 1)
        stat["durations"].append(float(event.get("duration", 0)))
    llm_rows = [
        [model, stat["calls"], stat["retries"], num(avg(stat["durations"]), " s")]
        for model, stat in sorted(llm_stats.items())
    ]
    out.append(table(["Model", "Calls", "Retries", "Avg duration"], llm_rows))
    out.append("")

    out += ["## Embedding calls", ""]
    embed_stats: dict[str, dict] = defaultdict(
        lambda: {"calls": 0, "chunks": 0, "tokens": 0, "durations": []}
    )
    for event in embeddings:
        stat = embed_stats[event.get("model", "unknown")]
        stat["calls"] += 1
        stat["chunks"] += int(event.get("chunks_count", 0))
        stat["tokens"] += int(event.get("prompt_tokens", 0))
        stat["durations"].append(float(event.get("duration", 0)))
    embed_rows = [
        [
            model,
            stat["calls"],
            stat["chunks"],
            stat["tokens"],
            num(avg(stat["durations"]), " s"),
        ]
        for model, stat in sorted(embed_stats.items())
    ]
    out.append(table(["Model", "Calls", "Chunks", "Tokens", "Avg duration"], embed_rows))
    out.append("")

    out += ["## Retrieval and similarity", ""]
    similarities = [
        float(item["similarity"])
        for event in retrievals
        for item in (event.get("doc_similarities") or [])
        if item.get("similarity") is not None
    ]
    docs_count = sum(len(event.get("doc_similarities") or []) for event in retrievals)
    thresholds = [
        float(event["min_similarity"])
        for event in retrievals
        if event.get("min_similarity") is not None
    ]
    threshold = last(thresholds)
    below = sum(1 for value in similarities if threshold is not None and value < threshold)
    sources = Counter(
        str(item.get("source") or item.get("id") or "unknown")
        for event in retrievals
        for item in (event.get("doc_similarities") or [])
    )
    retrieval_rows = [
        [
            len(retrievals),
            num(avg([float(e["retrieval_ms"]) for e in retrievals if "retrieval_ms" in e])),
            docs_count,
            num(min(similarities) if similarities else None),
            num(avg(similarities)),
            num(max(similarities) if similarities else None),
            num(threshold),
            below,
            len(sources),
        ]
    ]
    out.append(
        table(
            [
                "Queries",
                "Avg retrieval (ms)",
                "Docs",
                "Similarity min",
                "Similarity avg",
                "Similarity max",
                "Threshold",
                "Below threshold",
                "Sources",
            ],
            retrieval_rows,
        )
    )
    out.append("")
    if sources:
        out.append(
            table(
                ["Source", "Docs"],
                [[name, count] for name, count in sources.most_common(10)],
            )
        )
        out.append("")

    failures = Counter(
        str(event.get("message"))
        for event in events
        if event.get("level") in {"WARNING", "ERROR"}
    )
    out += ["## Warnings and errors", ""]
    out.append(table(["Message", "Count"], [[msg, count] for msg, count in failures.most_common()]))
    out.append("")

    out += ["## Recent traces", ""]
    traces = [event for event in events if event.get("message") in TRACE_MESSAGES][-25:]
    out.append(
        table(
            ["Time", "Event", "Detail"],
            [
                [short_ts(event.get("timestamp")), event.get("message"), trace_detail(event)]
                for event in traces
            ],
        )
    )
    out.append("")
    return "\n".join(out)


def main() -> None:
    source = open(sys.argv[1], encoding="utf-8") if len(sys.argv) > 1 else sys.stdin
    try:
        events = parse_events(source)
    finally:
        if source is not sys.stdin:
            source.close()
    print(build_report(events))


if __name__ == "__main__":
    main()
