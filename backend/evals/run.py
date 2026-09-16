"""Fixture-based recipe extract evals.

Usage (from backend/):
  uv run python -m evals.run
  uv run python -m evals.run --model openai/gpt-5.6-luna
"""

from __future__ import annotations

import argparse
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from app.services.recipe_extract import _llm_extract, _parse_html
from dotenv import load_dotenv

from evals.scorers import score_recipe

load_dotenv()

FIXTURES = Path(__file__).parent / "fixtures"
RESULTS_DIR = Path(__file__).parent / "results"


def list_cases() -> list[Path]:
    return sorted(p for p in FIXTURES.iterdir() if p.is_dir())

EXPECTATIONS = json.loads((FIXTURES / "expected.json").read_text())

def run_case(
    case_name: str,
    html: str,
    model: str,
) -> dict:
    markdown = _parse_html(html)
    expectations = EXPECTATIONS[case_name]
    if expectations is None:
        print(f"WARNING: No expectations for {case_name}")

    started = time.perf_counter()
    results = _llm_extract(markdown, model=model)
    predicted = json.loads(results.choices[0].message.content)
    usage = results.usage
    score = score_recipe(predicted, expectations)
    latency_ms = (time.perf_counter() - started) * 1000
    return {
        "case": case_name,
        "latency_ms": round(latency_ms, 1),
        "predicted": predicted,
        "score": score["score"],
        "details": score["details"],
        "input_tokens": getattr(usage, "prompt_tokens", 0) or 0,
        "output_tokens": getattr(usage, "completion_tokens", 0) or 0,
        "total_cost": float(getattr(usage, "cost", 0) or 0),
        # "scores": score_recipe(predicted, expected),
    }


def _display_results(results: list[dict], output_path: Path) -> None:
    headings = (
        f"{'CASE':<24} {'SCORE':>7} {'COST':>10} "
        f"{'LATENCY':>11} {'ING Δ':>7} {'STEP Δ':>8}"
    )
    print(f"\n{headings}")
    print("-" * len(headings))
    for result in results:
        details = result["details"]
        print(
            f"{result['case']:<24} "
            f"{result['score']:>7.1f} "
            f"${result['total_cost']:>9.6f} "
            f"{result['latency_ms']:>9.0f}ms "
            f"{details['ingredient_count_off']:>+7d} "
            f"{details['step_count_off']:>+8d}"
        )

    print(f"\nFull results: {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="google/gemini-2.5-flash-lite")
    parser.add_argument("--repeat", default=1, type=int)
    args = parser.parse_args()

    results = []

    html_files = sorted(FIXTURES.glob("*.html"))
    for index, html_file in enumerate(html_files, start=1):
        case_name = html_file.stem
        html = html_file.read_text()
        for i in range(args.repeat):
            row = run_case(case_name, html, model=args.model)
            results.append(row)
            if args.repeat > 1:
                row["case"] = f"{row['case']} #{i+1}"
        print(f"Finished example #{index} - {case_name}", flush=True)

    payload = {"model": args.model, "results": results}
    RESULTS_DIR.mkdir(exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    model_name = re.sub(r"[^a-zA-Z0-9._-]+", "-", args.model)
    output_path = RESULTS_DIR / f"{model_name}_{timestamp}.json"
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    _display_results(results, output_path)


if __name__ == "__main__":
    main()