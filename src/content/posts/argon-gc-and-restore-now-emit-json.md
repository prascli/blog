---
title: "Argon gc and restore now emit JSON"
description: "Four argon commands printed only text, so a script could not read their result. Registering them in the shared output list adds -o json with documented shapes."
pubDatetime: 2026-11-18T09:00:00+07:00
author: "Indra Prasetya"
category: "open-source"
tags:
  - Argon
  - CLI
  - JSON
  - Go
featured: false
draft: false
---

Four argon commands printed only text, so a script could not read their result: `argon gc` and the three `argon restore` subcommands, preview, reset, and branch. A human could read the output, but nothing else could. The fix in [argon-lab/argon#99](https://github.com/argon-lab/argon/pull/99) registers all four in the shared `-o/--output` list, so they take `-o json` like the rest of the CLI, and documents the shape of what they emit.

## What changed

`cli/cmd/output.go` gains `gcCmd`, `restorePreviewCmd`, `restoreResetCmd`, and `restoreBranchCmd` in the shared output list. That single registration is what makes `-o json` available on all four.

The JSON bodies are built by small functions, `gcReportJSON`, `restorePreviewJSON`, `restoreResetJSON`, and `restoreBranchJSON`, so their shape is testable without a live project or WAL. That matters here because `gc` and `restore` need a real project to exercise end to end.

The shapes:

- `gc` emits `dry_run`, `branches` (each branch name plus its `cutoffs` map), and `entries_removed`. Branches with no cutoffs are omitted, and `branches` is an empty list rather than null when nothing is reclaimable.
- `restore preview` emits `branch`, `current_lsn`, `target_lsn`, `operations_to_discard`, and `affected_collections`, which is an object, empty rather than null.
- `restore reset` emits `branch`, `target_lsn`, and `backup_branch` only when a backup branch was created.
- `restore branch` emits the new branch name and the LSN it was forked at.

## Why the registration test exists

A shape test alone would not catch the real defect. The PR includes `TestGCAndRestoreAcceptJSONOutput`, which fails before the change with `gc has no --output flag` and the same for the three restore subcommands. The shape tests, `TestGCReportJSONShape` and `TestRestoreJSONShapes`, pass on their own because they call the builder functions directly. Only the registration test proves the flag is wired to the command. The PR runs both, plus the whole `./cmd/` package.

## Verification from the PR

```
$ cd cli && go build ./...          # ok
$ go test ./cmd/ -run 'TestGCReportJSONShape|TestRestoreJSONShapes|TestGCAndRestoreAcceptJSONOutput' -v
=== RUN   TestGCAndRestoreAcceptJSONOutput
--- PASS: TestGCAndRestoreAcceptJSONOutput (0.00s)
=== RUN   TestGCReportJSONShape
--- PASS: TestGCReportJSONShape (0.00s)
=== RUN   TestRestoreJSONShapes
--- PASS: TestRestoreJSONShapes (0.00s)
PASS
ok      argon-cli/cmd   0.012s
$ go test ./cmd/                    # whole package, existing tests included
ok      argon-cli/cmd   5.562s
```

`gofmt -l cmd/` prints nothing and `go vet` on the package is clean. The repository build was run inside the nested `cli` module, which is where these commands live. The change is 6 files, 195 lines added and 1 removed, and it closes issue #75.

## Why this matters this week

The week's trending projects are dominated by coding agents and the tooling around them: GitHub Trending lists agent skill bundles, MCP servers, and workflow orchestrators, and dev.to's trending clusters include AI coding agents and the risks of agents reading untrusted input. The honest link is narrow. An agent that drives a CLI cannot parse prose, so a command that only prints text is opaque to it. This PR makes `gc` and `restore` readable by a script or agent, with named fields instead of scraped sentences. That is the whole change, and it is enough.

Sources checked on 18 November 2026: trendshift.io/weekly, github.com/trending, and dev.to/trending.

## The rule to carry

When a command already has a shared output mechanism, add new subcommands to it instead of inventing a second flag. Then split the work into two tests: one that calls the builder and checks the shape, and one that checks the flag is registered on the command. The first proves the data is right, the second proves a user can actually ask for it. Fixing only one leaves either a correct shape nobody can request, or a flag that emits nothing.

The diagram for this piece is short. Four commands on the left, the fields they now emit on the right:

<figure>
  <img src="/diagrams/argon-gc-and-restore-now-emit-json-0.svg" alt="Four argon commands move from prose-only output to -o json: gc emits dry_run, branches, and entries_removed; restore preview emits branch, current_lsn, target_lsn, operations_to_discard, and affected_collections; restore reset emits branch, target_lsn, and backup_branch when created; restore branch emits the new branch name and its forked LSN." width="646" height="725" loading="lazy" decoding="async">
  <figcaption>Four commands, one shared output flag, documented fields instead of prose.</figcaption>
</figure>
