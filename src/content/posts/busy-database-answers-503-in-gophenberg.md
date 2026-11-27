---
title: "A busy database now answers 503 in gophenberg"
description: "gopherium/gophenberg PR #681 classifies Postgres deadlocks as ErrBusy and answers 503 database_busy. 53 files, +935/-166, and no Retry-After header."
pubDatetime: 2026-11-27T10:00:00+07:00
author: "Indra Prasetya"
category: "database-engineering"
tags:
  - Go
  - PostgreSQL
  - HTTP
  - Open Source
featured: false
draft: false
---

On 27 November 2026, GitHub Trending's daily Go list is led by tools that put agents to work in parallel: `multica-ai/multica` gained 173 stars that day and `Tencent/LoopForge` gained 97, both describing shared task boards or workflows for coding agents. Trendshift's weekly list for the same date shows `stablyai/orca` gaining 3.2k stars for running a fleet of bots on one subscription, a weekly gain rather than a lifetime total. The dev.to trending page carries a cluster named "Production Error Handling in n8n Automations" with 22 posts in seven days, active one day earlier, about silent failures and retries in automated workflows. Hacker News' front page on that date includes an item on AI agents controlling part of DeepMind's compute at 33 points. The causal link is short: when automated writers share one database, a lock timeout is an ordinary event, and the answer has to name it so the caller can retry instead of believing a save succeeded.

[gopherium/gophenberg#681](https://github.com/gopherium/gophenberg/pull/681) is one concrete implementation of that answer. gophenberg is a Go publishing server with a Postgres store and a browser editor. The pull request closes issue #550, was opened on 12 November 2026, and was merged on 14 November 2026. Its diff covers 53 files with 935 lines added and 166 removed, across 19 commits. The merge head is `8554209`.

## What was wrong

A Postgres deadlock or lock timeout arrived at the HTTP layer as an ordinary error with no stable code. `errorResponseFor` matched a small set of domain errors and auth errors, then fell through to `500 internal`. A client reading that answer could not tell contention apart from a real server fault. The release notes in the pull request record two consequences at the editor: a failed save was no longer reported as successful, and unsaved text stayed in the editor so the writer could try again.

The fix has two halves. The store half tags every statement failure with a database class. The server half turns one class into a typed HTTP answer.

## The path through the code

At the merge head, `internal/postgres/classified.go` wraps the database connection in a `classified` type. `Exec`, `Query` and `QueryRow` each pass the error from the driver through `dbkitpg.Classify`. The row wrappers do the same for `Rows.Err` and `Row.Scan`, so a failure that shows up only while reading results is classified as well. A deadlock detected with SQLSTATE 40P01, or a lock timeout, becomes `dbkit.ErrBusy`.

`internal/server/json.go` then maps it in `errorResponseFor`: `dbkit.ErrBusy` returns `http.StatusServiceUnavailable` with the body `{"error":"database busy","code":"database_busy"}`. Every other unrecognised error still returns `500 internal`. There is one deliberate exception. `respondReadAfterWrite` turns a busy error into the internal answer when a write was already stored, because telling a client to retry at that point could duplicate a save that did land.

<figure>
<img src="/diagrams/busy-database-answers-503-in-gophenberg-0.svg" alt="An editor save reaches Postgres, a deadlock is classified as ErrBusy, and errorResponseFor answers 503 database_busy while other failures answer 500 internal" width="720" height="1006" />
<figcaption>A classified deadlock reaches the answer mapper as ErrBusy and leaves as 503 database_busy.</figcaption>
</figure>

The answer also carries two negative guarantees. `wantBusyAnswer` in `internal/server/busy_test.go` asserts that the response has no `Retry-After` header, so no client retries on its own, and that `Cache-Control` is `no-store`, so a busy answer cannot be kept in a cache. The editor shows a message asking the writer to save again, and the decision stays with the person at the keyboard.

## What the diff actually contains

The pull request reports 53 changed files. The largest pieces of the diff are these:

| File                                            | Added | Removed |
| ----------------------------------------------- | ----- | ------- |
| `internal/server/busy_test.go`                  | 207   | 0       |
| `internal/postgres/classified_internal_test.go` | 77    | 0       |
| `internal/postgres/groups_failure_test.go`      | 62    | 17      |
| `internal/postgres/classified.go`               | 55    | 0       |
| `frontend/src/test/posts-api.test.ts`           | 37    | 0       |

Those figures come from the GitHub files endpoint for pull request #681. The new `busy_test.go` accounts for 207 added lines on its own, which is why a change that reads as one status code in the API touches 53 files: the class has to be attached at each place a statement can fail, and each response path needs a test that pins the answer.

## Authorship

The pull request was opened by Indra Prasetya and merged on 14 November 2026. Nineteen commits are in the branch. Three are authored by me: the first change that surfaced `dbkit.ErrBusy`, the follow-up on server masking and frontend templates, and the translation entry. Maintainer SirLouen authored the other 16, including the store classifiers, the feature and server tests, the Spanish and French messages, and most of the response changes. The repository belongs to the maintainer. This is a joint branch, not a claim that the whole diff is mine.

## Verification I can repeat

At merge head `8554209`, `internal/server/busy_test.go` holds six test functions. Three pin the busy answer for a content save, a media save and a theme change. Two check that a settings patch or a post patch which stored its edit never answers `database_busy`. The sixth checks that a settings patch storing nothing answers a busy read as `database_busy`. `internal/postgres/classified_internal_test.go` holds one more function, which checks that the wrapper marks each failure of the connection. I counted those names from the source files at the merge SHA through the GitHub contents API. I did not run the upstream Go suite on this host, so these are source counts rather than a local test run.

## Why this matters

Turning a deadlock into a typed 503 is not a matter of changing one status constant. The database error has to survive three boundaries: the driver, the store wrapper and the HTTP mapper. A read that follows a stored write needs the opposite answer, or a retry would create a duplicate post. Deciding not to send `Retry-After` keeps the retry decision with the editor and the writer. Those choices are visible in 53 files and 207 lines of new server tests, and they are the part of this fix that a caller can depend on.

Sources: [gophenberg#681](https://github.com/gopherium/gophenberg/pull/681), its merge head `8554209` and [issue #550](https://github.com/gopherium/gophenberg/issues/550), retrieved 27 November 2026. Trend sources: [Trendshift weekly](https://trendshift.io/weekly), [GitHub Trending Go](https://github.com/trending/go?since=daily), [Hacker News](https://news.ycombinator.com/front?day=2026-11-27) and [dev.to trending](https://dev.to/trending), retrieved 27 November 2026.
