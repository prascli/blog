---
title: "An unreadable log file now stops caddy-analyze with exit 1"
description: "lenny-ts/caddy-analyzer PR #150 changes a silent skip into a non-zero exit. Six files, +188/-15, and an error that names the file."
pubDatetime: 2026-11-26T10:00:00+07:00
author: "Indra Prasetya"
category: "open-source"
tags:
  - Go
  - CLI
  - Observability
  - Open Source
featured: false
draft: false
---

On 26 November 2026, GitHub Trending's daily list is led by agent tooling: `cursor/plugins` gained 416 stars that day, `mvanhorn/last30days-skill` gained 945, `google-labs-code/stitch-skills` gained 355, and `mjmirza/app-store-compliance` gained 858. Trendshift's weekly list for the same date includes three command line controllers for coding agents, `pingdotgg/t3code` at 7.9k stars, `stablyai/orca` at 5.1k, and `google-gemini/gemini-api-cli` at 2.5k. Hacker News' front page carries an agent essay at 929 points. The causal link to this article is short: when scripts and agents are the main callers of a CLI, the exit status is the only machine readable proof that the work ran, so a tool that prints an error and exits 0 is a silent failure in the control plane.

[lenny-ts/caddy-analyzer#150](https://github.com/lenny-ts/caddy-analyzer/pull/150) is one concrete case. caddy-analyzer is a zero-dependency Go CLI with 45 stars for analysing Caddy v2 access logs. It was failing exactly that contract.

## The reproduction

[Issue #136](https://github.com/lenny-ts/caddy-analyzer/issues/136), opened 17 November 2026, gives a two-line reproduction:

```
caddy-analyze /tmp/this-file-does-not-exist.log
echo $?
```

The reported output was an error line followed by `no log entries found`, and the printed status was `0`. The issue's acceptance criteria ask for four things: a non-zero status for a missing or unreadable file, an error that identifies the file, defined and tested behaviour for partial failures across several inputs, and tests for missing and unreadable files.

The cause sits in `pkg/reader/reader.go`. `FileReader.Read` started a reader goroutine and printed errors from inside it, but returned no error to its caller. `runOnceMode` in `cmd/root.go` had nothing to propagate, so the command ended as a successful empty analysis.

## The change

The pull request was opened by Indra Prasetya and merged on 21 November 2026. Four commits are in the branch. The first two, `d96bc9c` and `1676a03`, are authored by Indra Prasetya. The last two, including the head commit `a807e0a`, are authored by maintainer lenny-ts. The repository belongs to the maintainer. The final merge includes his follow-up work on read errors in followed logs, so this is a joint branch rather than a claim that every commit is mine.

The diff is 6 files, +188 and -15 lines:

| File                               | Added | Removed |
| ---------------------------------- | ----- | ------- |
| `pkg/reader/reader.go`             | 58    | 11      |
| `pkg/reader/follow_cancel_test.go` | 53    | 0       |
| `cmd/root.go`                      | 37    | 2       |
| `cmd/top.go`                       | 26    | 2       |
| `pkg/reader/reader_test.go`        | 12    | 0       |
| `cmd/fanin_test.go`                | 2     | 0       |

At the merge head, `FileReader.Read` checks every path with `os.Stat` before it starts the goroutine. Missing paths are recorded through a `sync.Once` guard, which keeps the first error, and the available paths still stream. If no path is available, `Read` returns the error immediately. The interface also gains an `Err()` method so a streaming error can be read after the lines channel drains. `runOnceMode` returns that error, which is what turns it into exit 1.

<figure>
<img src="/diagrams/caddy-analyzer-unreadable-log-exit-code-0.svg" alt="Log paths are checked with os.Stat, missing paths are recorded as an error while available paths stream, and runOnceMode returns the error so the process exits 1" width="492" height="972" />
<figcaption>The missing-path branch now reaches the process exit code.</figcaption>
</figure>

Using `os.Stat` rather than open and close is deliberate. An input can be a FIFO, and opening it twice would block the second attempt. The partial failure rule is now explicit: readable inputs are still analysed, the first open error is preserved, and the command exits non-zero.

## The verification

The pull request reports three checks: `go test ./pkg/reader/...` passed in 0.42s, `go test ./cmd/...` passed in 0.02s, and `go build ./...` produced no output. Those are the figures recorded in the PR, not measurements I repeated on this host.

The before and after pair is the part that matters for automation. Before the change, a missing input printed a message and `echo $?` returned `0`. After the change, the same command reports `error reading /tmp/this-file-does-not-exist.log: open /tmp/this-file-does-not-exist.log: no such file or directory`, and `echo $?` returns `1`. A caller can now branch on the status and still read the filename from stderr.

Two details came from the maintainer's commits, not the original patch. Follow mode with several files reads them concurrently, because a blocked first file used to starve the rest. The `Err()` method was added so errors raised after streaming starts are not lost. Both are visible in the six-file diff at `a807e0a`.

## What the trend means here

The agent tooling wave makes the command line a machine-facing interface. A human sees `no log entries found` and moves on; a cron job or an agent sees only the status code. This fix changes one line of that contract, from 0 to 1, and it took 6 files and 4 commits because the error had to travel from a goroutine through the reader interface to the command entry point. That is the honest size of a small reliability fix in a tool with several input sources.

Issue #136 remains closed. The four acceptance criteria are covered by the new tests and the recorded behaviour, including the partial failure case that the issue asked to define.

Sources: [caddy-analyzer#150](https://github.com/lenny-ts/caddy-analyzer/pull/150), its merge head `a807e0a` and [issue #136](https://github.com/lenny-ts/caddy-analyzer/issues/136), retrieved 26 November 2026. Trend sources: [Trendshift weekly](https://trendshift.io/weekly), [GitHub Trending daily](https://github.com/trending?since=daily), [Hacker News](https://news.ycombinator.com/) and [dev.to trending](https://dev.to/trending), retrieved 26 November 2026.
