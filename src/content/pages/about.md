---
title: "About"
description: "Indra Prasetya is a senior software engineer writing about backend systems, databases, infrastructure, and AI engineering."
---

I am Indra Prasetya, a senior software engineer. I build backend systems, the
databases underneath them, and the pipelines that ship and check them. Most of
my work is in Go, TypeScript, Python, and PostgreSQL.

This journal is where I write down what I learned while doing that work:
migrations that had to run without downtime, services that failed in a way worth
explaining, tooling for AI coding agents that I maintain, and the measurements
behind any number I quote. If I cannot reproduce a figure, I do not publish it.

## What I work on

- **Backend engineering.** Service design, APIs, idempotent job pipelines, and
  the unglamorous parts that decide whether a system is reliable.
- **Database engineering.** PostgreSQL schema design, migrations, indexing, and
  query performance.
- **DevOps and infrastructure.** Reproducible builds, CI/CD, containerised
  deployments, observability, and self-hosted infrastructure.
- **AI engineering.** The practical side of coding agents: context budgets,
  instruction files, and verification.
- **Open source.** I maintain or contribute to tooling I actually run, including
  [agentdiet](https://agentdiet.qansa.web.id), a CLI that measures the context an
  AI coding agent loads, and
  [cfgaudit](https://github.com/cfgaudit/cfgaudit), where I added the rule that
  detects hidden instructions separated by long runs of blank characters.

## How this site is built

The publication is a static site built with [Astro](https://astro.build/) on the
open-source [AstroPaper](https://github.com/satnaing/astro-paper) theme, which is
used under the MIT licence and customised here.

Every article is a Markdown file in a Git repository. Publishing means opening a
pull request, and GitHub Actions builds, tests, and deploys the result to
Cloudflare Pages. There is no database, no admin panel, and no tracking script.
Search is a static index built at deploy time, so it works without a backend.

## Elsewhere

- GitHub: [github.com/prascli](https://github.com/prascli)
- dev.to: [dev.to/prascli](https://dev.to/prascli)
- Email: [indra@qansa.id](mailto:indra@qansa.id)
- RSS: [/rss.xml](/rss.xml)

The writing here is published under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Quote it, translate
it, argue with it, just link back.
