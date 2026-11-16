---
title: "Why this blog exists"
description: "A small, static home for writing about backend systems, PostgreSQL, and the tooling around AI coding agents."
pubDatetime: 2026-11-16T09:00:00+07:00
author: "Indra Prasetya"
category: "engineering-notes"
tags:
  - Writing
  - Engineering Practice
  - Static Sites
draft: false
---

I write about systems I can measure. That usually means a backend service, a
database migration, a CLI tool, or a pipeline that failed in a way worth
explaining. If a number appears in a post here, it came from an API, a test run,
or a command whose output I can show.

This site is deliberately plain: static HTML generated from markdown files kept
in a git repository. No database, no tracking scripts, no comments. The files
are the source of truth, and a push rebuilds the published site.

## What gets published here

- Notes on backend work in Go, TypeScript and Python, mostly on PostgreSQL.
- Post-mortems of things that broke, with the fix and the reasoning.
- Write-ups of the open-source tooling I maintain, including
  [agentdiet](https://agentdiet.qansa.web.id), a CLI that measures the context
  an AI coding agent loads on every request and fails a build when it grows past
  a budget.
- Migration and delivery work: what moved, what it cost, and how it was verified.

## Where else this appears

<figure>
  <img src="/diagrams/why-this-blog-exists-0.svg" alt="Publishing flow: a merged pull request enters a deduplicated candidate queue, one candidate is picked each week, checked for a live link, drafted in markdown, rendered with a diagram at build time, published here as the canonical page, then cross-posted to dev.to with a canonical URL." width="264" height="864" loading="lazy" decoding="async">
  <figcaption>From merged pull request to canonical page.</figcaption>
</figure>

Longer pieces are cross-posted to [dev.to](https://dev.to/prascli). The canonical
URL always points back here, so search engines and readers land on one copy.

That is the whole plan. Publish when there is something measured to say, and skip
the week when there is not.
