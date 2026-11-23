---
title: "Name the proxy: instrument metadata in a market breadth skill"
description: "The market-breadth-analyzer skill called SPY the S&P 500. PR #839 adds explicit instrument metadata and generic benchmark fields in 6 files, +164/-11, with 198 tests passing."
pubDatetime: 2026-11-23T10:00:00+07:00
author: "Indra Prasetya"
category: "ai-engineering"
tags:
  - AI Agents
  - Agent Skills
  - Python
  - Open Source
featured: false
draft: false
---

Agent skills are having a moment. The GitHub Trending snapshot for 23 November 2026 shows four skill bundles in the top ranks: elementalsouls/Claude-BugHunter gained 1,716 stars that day, obra/superpowers 788, mvanhorn/last30days-skill 668, and google-labs-code/stitch-skills 494. Trendshift's weekly view, retrieved the same day, lists more of the same. On dev.to, the trending cluster includes "Why we no longer use LangChain for building our AI agents" (20 November 2026). The argument underneath all of it is reliability: an agent that produces confident output is useful only if the output says what it actually measured.

[tradermonty/claude-trading-skills#839](https://github.com/tradermonty/claude-trading-skills/pull/839), merged 23 November 2026, is a small fix on exactly that seam. The market-breadth-analyzer skill reported its benchmark as "S&P 500" while the data was SPY, an exchange-traded fund that tracks the index. The pull request adds explicit instrument metadata so a consumer can tell the proxy from the thing it proxies. It is 6 files, +164, -11, authored by me across three commits and merged by the maintainers. It closes issue #833.

## The wrong label was in the output, not the math

The skill builds a divergence score from a price series and a breadth series, then renders a signal and a Markdown report. Nothing about the calculation was wrong. The label was. A reader saw "S&P 500" and could reasonably assume the input was the index itself, when the default CSV held SPY prices.

That distinction matters more than it looks. An ETF is a traded instrument with an expense ratio, tracking error, and a distribution policy. An index is a calculation. A total-return series and a price-return series of the same ticker are different data. Collapsing all of that into the words "S&P 500" is a silent claim about provenance, and the skill had no field in which to state it.

## What the change adds

The calculator takes a new optional `instrument` argument, a dictionary with four keys:

| Key               | Example value     | Purpose                                 |
| ----------------- | ----------------- | --------------------------------------- |
| `symbol`          | `SPY`             | The instrument the numbers came from    |
| `instrument_type` | `ETF`             | ETF, index, or other                    |
| `proxy_for`       | `S&P 500 / ^GSPC` | What the instrument stands in for       |
| `adjustment`      | `unknown`         | Total return, price return, or unstated |

The signal text now reads `SPY (S&P 500 / ^GSPC proxy)` instead of `S&P 500`. The report generator displays the metadata and carries a methodology note about the proxy relationship. Generic `benchmark_*` fields sit next to the retained `sp500_*` fields, so callers can migrate without losing existing output.

```python
result = calculate_divergence(rows, instrument={
    "symbol": "SPY",
    "instrument_type": "ETF",
    "proxy_for": "S&P 500 / ^GSPC",
    "adjustment": "unknown",
})
```

<figure>
  <img src="/diagrams/spy-proxy-instrument-metadata-0.svg" alt="The CLI supplies SPY instrument metadata to the divergence calculator, which emits generic benchmark fields and retained sp500 fields into the signal text and the Markdown report; the library default stays unknown so non-SPY data is not silently labelled." width="567" height="954" loading="lazy" decoding="async">
  <figcaption>Instrument metadata enters at the calculator and reaches both output paths; the legacy fields stay for existing callers.</figcaption>
</figure>

## The default is the interesting part

The library call `calculate_divergence(rows)` does not assume SPY. With no metadata supplied, it fills all four keys with `unknown`, and the signal falls back to the word `unknown` as the benchmark label. The CLI supplies the SPY metadata explicitly for its default CSV source, so the normal command keeps its familiar output while a caller feeding different data cannot inherit a label that is wrong.

That inversion is the substantive design decision. A library that defaults to a plausible answer will eventually label someone else's data as SPY. A library that defaults to `unknown` forces the caller to make the claim. The tests in the PR cover both paths: the unknown default and a custom instrument with its own symbol, type, proxy target, and adjustment. The added test file is 74 lines, and the full market-breadth-analyzer suite reports 198 passing tests on the PR. The CI run on the final commit, [45060739878](https://github.com/tradermonty/claude-trading-skills/actions/runs/45060739878), shows both `Test (market-breadth-analyzer)` and `Coverage` green.

## Why this belongs to the skill era

A coding agent that reads a skill package sees fields and docstrings, not the intent of whoever wrote a CSV loader. When the only label is a string inside a formatted sentence, there is nothing for the next agent, the next script, or the next reviewer to inspect. Adding a structured `instrument` object changes the unit of trust: the claim becomes a field with a name and a value that a deterministic check can assert.

That is the practical shape of the current skills trend. The bundles on GitHub Trending this week package hundreds of skills and slash commands, which makes discovery cheap and correctness expensive. A bundle of 82 bug-hunting skills is only as reliable as the output contract of each one. This PR is one such contract, made explicit in a calculator change of +44/-7 lines plus a matching report change.

The work also had to keep the package in sync. The repository ships a generated `market-breadth-analyzer.skill` artifact, and the PR rebuilds it, runs the package drift check, and adds a CHANGELOG entry under `## [Unreleased]`. English and Japanese skill docs were verified with the repository's generator. None of that is glamorous, but it is what makes a skill change real for the people who install the package rather than read the source.

## Sources

- [tradermonty/claude-trading-skills#839](https://github.com/tradermonty/claude-trading-skills/pull/839), merged 23 November 2026.
- Issue [833](https://github.com/tradermonty/claude-trading-skills/issues/833), the report that prompted the fix.
- CI run [45060739878](https://github.com/tradermonty/claude-trading-skills/actions/runs/45060739878), final commit `a1a505be`.
- [GitHub Trending](https://github.com/trending) and [Trendshift weekly](https://trendshift.io/weekly), retrieved 23 November 2026.
- [dev.to trending cluster](https://dev.to/t/trending/latest), entries dated 15 to 20 November 2026.
