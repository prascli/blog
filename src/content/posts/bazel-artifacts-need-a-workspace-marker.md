---
title: "Bazel output trees need a workspace marker before a cleaner can remove them"
description: "Kolgrim33/broom PR #6 adds marker-verified bazel-bin and bazel-out rules in 3 files, +129/-0. The test keeps 4 marked artifacts and ignores 2 unmarked names."
pubDatetime: 2026-11-25T10:00:00+07:00
author: "Indra Prasetya"
category: "open-source"
tags:
  - Rust
  - CLI
  - Bazel
  - Open Source
featured: false
draft: false
---

A directory called `bazel-bin` usually means generated output, but a directory name alone cannot prove that. A cleaner that matches names without asking what sits next to them will eventually delete someone's own folder. That is the problem [Kolgrim33/broom#6](https://github.com/Kolgrim33/broom/pull/6) addresses. The pull request adds Bazel rules to broom, a zero-dependency Rust CLI for finding and sweeping stale build artifacts. It was merged on 24 November 2026.

I opened the pull request and wrote its single commit, `9e45019`, which is authored by Indra Prasetya. Kolgrim33 merged it into their repository. That split matters: the project is theirs, the implementation is mine. The diff is 3 files, +129 and -0, made up of `README.md` with 1 added line, `src/ecosystems.rs` with 19, and `tests/test_bazel.rs` with 109. The pull request references broom issue #1, which is still open, so this is one slice of that request and not a claim that the request is complete.

## A name is not a marker

Broom's rule model already separates two ideas. A rule carries the exact artifact directory name, a list of `parent_markers` that must exist beside it, and an optional `inner_marker` that must exist inside it. The Rust rule matches `target` only next to `Cargo.toml`. The CMake rule matches `build` next to `CMakeLists.txt` and additionally requires `CMakeCache.txt` inside, because `build` is a common name for a hand-made folder.

Bazel output trees have specific names, so the new rules need no inner marker. They still need a parent marker. Each of the two rules matches only when the parent directory contains one of three files: `WORKSPACE`, `WORKSPACE.bazel`, or `MODULE.bazel`. Those three files cover the legacy workspace layout and the Bzlmod layout, which matters because a project can be at any point in that migration.

| Marker            | What it signals                               |
| ----------------- | --------------------------------------------- |
| `WORKSPACE`       | Legacy Bazel workspace file                   |
| `WORKSPACE.bazel` | Legacy workspace under its alternate filename |
| `MODULE.bazel`    | Bzlmod module manifest                        |

The implementation is 19 added lines in `src/ecosystems.rs`. It adds `Ecosystem::Bazel` to the enum and to `Ecosystem::ALL`, returns "Bazel" from `name` and "bazel" from `id`, accepts `bazel` and `bzl` in `from_str_loose`, assigns a green ANSI badge colour, and appends two `ArtifactRule` entries. Because `ALL`, `id`, and `from_str_loose` are shared, `--type bazel`, JSON output, badges, and the shell completions added in broom#5 all pick up the new ecosystem without separate changes. `Cargo.toml` gains no dependency.

<figure>
<img src="/diagrams/bazel-artifacts-need-a-workspace-marker-0.svg" alt="A project tree reaches broom, an exact name check finds bazel-bin or bazel-out, then a parent marker decision sends marked directories to the sweep and unmarked ones to be left alone" width="452" height="859" />
<figcaption>The directory name opens the check, the workspace marker closes it.</figcaption>
</figure>

## The test proves both sides

`tests/test_bazel.rs` adds 109 lines and one test named `detects_bazel_artifacts_and_avoids_false_positives`. It builds a temporary tree with three marked workspaces: one with `WORKSPACE`, one with `MODULE.bazel`, and one with `WORKSPACE.bazel`. Each holds a `bazel-bin` or `bazel-out` directory containing bytes. It also creates `plain/bazel-bin` and `plain/bazel-out` with no marker in the parent.

The test runs `broom --json -t bazel` against that root, then asserts four things. Four expected paths appear in the output. The JSON reports `"count": 4`. Neither plain path appears. Without the marker check, the last two assertions would fail.

The pull request records a red check: against the base `src/ecosystems.rs`, the new test fails with `unknown ecosystem 'bazel'`. That is the before state. After the change, the reported verification is `cargo fmt --all -- --check`, `cargo clippy --all-targets -- -D warnings`, and `cargo test --all-targets`, all passing. The CI matrix includes macOS and Windows and was not run locally, so those two platforms are reported as untested in this account.

## Counting the tests from source

The pull request body reports 15 unit tests, 9 integration tests, 1 Bazel integration test, and 2 completion tests. I did not take that on trust. At the merge head `9e45019`, I counted `#[test]` attributes across the 10 Rust source files in the tree: `cleaner.rs` has 1, `cli.rs` has 7, `ecosystems.rs` has 2, `progress.rs` has 5, `tests/integration.rs` has 9, `tests/test_bazel.rs` has 1, and `tests/test_completions.rs` has 2. That is 27 in total, split into 15 unit and 12 integration, which matches the pull request's four groups exactly.

That count is a repeatable measurement, not a figure quoted from prose. Clone the repository, check out `9e45019`, and count `#[test]` in `*.rs`. The same tree's `Cargo.toml` has no `[dependencies]` table, so the zero-dependency claim can be checked in one read.

## What remains open

Issue #1 lists four candidate ecosystems: PHP Composer, Godot, Bazel, and Scala/sbt. The merged tree already carries rules for PHP under `vendor` with an `autoload.php` inner marker, for Godot under `.godot` and `.import`, and for Scala under `target`, `.bloop`, and `.metals`. This pull request takes the remaining Bazel slice. The issue's acceptance checkboxes are still unchecked and the issue is still open, so nobody should read this merge as closing it.

The useful lesson is small and portable: when a cleanup tool can delete data, the directory name is only the first question. The second question is what proves that the directory belongs to a build. Three marker files and 19 lines of rule code answer that question for Bazel without adding a crate.

Sources for the rule and the numbers: [Kolgrim33/broom#6](https://github.com/Kolgrim33/broom/pull/6), its merge head `9e45019`, and [broom issue #1](https://github.com/Kolgrim33/broom/issues/1), all retrieved 25 November 2026.
