---
title: "Generate shell completions from the binary, with no new dependency"
description: "Kolgrim33/broom PR #5 adds --completions for bash, zsh and fish in 3 files, +348/-0. One option table feeds all three scripts and Cargo.toml gains no dependency."
pubDatetime: 2026-11-24T10:00:00+07:00
author: "Indra Prasetya"
category: "open-source"
tags:
  - Rust
  - CLI
  - Shell
  - Open Source
featured: false
draft: false
---

New command-line tools keep arriving as single binaries, and shell completion is the small tax each one pays before it feels installed. Trendshift's weekly view, retrieved 24 November 2026 for the week of 23 to 29 November, lists the experimental `google-gemini/gemini-api-cli` at 503 stars gained that week. The `cli` tag on dev.to carried a run of independent tool releases on 22 and 23 November, among them a one-command repository readiness checker and a CLI profile manager with terminal OAuth approval. That is not evidence that completions are suddenly fashionable. It is evidence that small tools keep shipping, and that their users still have to wire them into a shell by hand.

[Kolgrim33/broom#5](https://github.com/Kolgrim33/broom/pull/5) is one concrete way to pay that wiring cost without growing the dependency tree. It adds `--completions <shell>` to broom, a zero-dependency Rust utility for finding and sweeping stale build artifacts. The pull request was merged on 23 November 2026. I opened it and wrote its single commit, `d7fce40e`; Kolgrim33 merged it into their project. That split is worth stating plainly: the repository is theirs, the implementation is mine. The diff is 3 files, +348 and -0. The PR references broom issue #2, which is still open, so this is a step toward that request and not a claim that the request is finished.

## The flag prints a script and stops

The intended use is a redirect into the shell's own completion directory:

```sh
broom --completions bash > ~/.local/share/bash-completion/completions/broom
broom --completions zsh > ~/.zfunc/_broom
broom --completions fish > ~/.config/fish/completions/broom.fish
```

Three shells are supported: bash, zsh and fish. Parsing happens in `src/cli.rs`, where the new `ParseOutcome::PrintCompletions(String)` variant carries the generated text. In `src/main.rs`, that variant prints the string and returns `ExitCode::SUCCESS` before the path validation, scan or clean code runs. A completion request cannot touch a file on disk. That matters for a tool whose main job is deleting build artifacts.

<figure>
  <img src="/diagrams/shell-completions-from-the-binary-0.svg" alt="The shell requests --completions, the parser checks the shell name, valid names reach the three generators which read the shared option tables and emit a script to stdout, while an unknown name returns an error with exit code 2." width="716" height="795" loading="lazy" decoding="async">
  <figcaption>The completion path reads the same option tables as the argument parser, so a new flag reaches the generated script without editing three generators by hand.</figcaption>
</figure>

## One table, three generators

The part I care about is where the script content comes from. Broom's parser already held the option descriptions in a shared table, with separate constants for the accepted `--sort` values (`size`, `age`, `path`) and the ecosystem IDs accepted by `--type`. The bash, zsh and fish generators read those same constants. They render the data into three different syntaxes: bash's `COMPREPLY` array, zsh's `_arguments` specs and fish's `complete` calls.

This is the whole design claim, and it is why the diagram above has a single source feeding three outputs. A completion script is a second description of the interface. When the two descriptions live in different files, they drift: a new flag is added to the parser, and the completion script quietly stops offering it. Generating from the parser's own table removes the second description. The generated text is never committed either, so there is no stale artifact in the repository to forget.

The new tests enforce exactly that. The unit test `generates_completions_for_all_supported_shells` loops over the three shells and asserts that every script contains each long flag, each sort value and each ecosystem ID. The integration test `completion_scripts_cover_flags_and_values` runs the compiled binary for all three shells and checks the same properties against its stdout. The tests fail if a generator lags behind the table.

## The error path is a normal CLI path

An unsupported shell name goes through the same `completion_script` function. It lowercases the input, so `--completions BASH` works, and an unknown value produces `unknown shell 'tcsh'. Supported shells: bash, zsh, fish` on stderr with exit status 2. Status 2 is the same code broom uses for other argument errors, so a script can handle a bad shell name without a special case. There is no panic path and no partial output on that branch.

## What the numbers actually are

The merged tree at `d7fce40e` contains 7 unit tests and 6 integration tests across the crate, 13 in total. The completion work added 276 lines to `src/cli.rs`, 4 lines to `src/main.rs` and a 68-line end-to-end test file. `Cargo.toml` has no `[dependencies]` table, before or after the change, so the completion feature adds no crate to the build. The PR's verification notes report `cargo fmt --all -- --check`, `cargo clippy --all-targets -- -D warnings` and `cargo test --all-targets` clean, plus `bash -n`, `zsh -n` and `fish -n` syntax checks on the generated scripts. The test counts above come from counting `#[test]` attributes in the merged source, not from trusting the PR prose.

The limit of this approach is worth naming. Hand-written generators are code, and code has to be maintained. A mature CLI with dozens of flags may prefer a maintained completion library, accepting a dependency in exchange for covering shell-specific edge cases such as quoting and nested subcommands. Broom has one command, a flat flag list and a hard zero-dependency constraint in its package description. For that shape, 348 lines buys completions that cannot silently fall out of sync, and the shell gets them from the binary it already installed.

Sources for the trend snapshot: [Trendshift weekly, week of 23 November 2026](https://trendshift.io/weekly) and [dev.to `cli` tag, retrieved 24 November 2026](https://dev.to/t/cli).
