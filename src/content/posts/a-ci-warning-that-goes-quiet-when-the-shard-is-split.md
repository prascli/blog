---
title: "A CI warning that goes quiet when the shard is split"
description: "gstack compared a shard's wall time with a prediction summed over its files. Once the shard ran as four parallel jobs, the warning only fired after a six-fold slowdown."
pubDatetime: 2026-11-16T17:10:00+07:00
author: "Indra Prasetya"
category: "devops-and-infrastructure"
tags:
  - CI
  - Testing
  - TypeScript
  - gstack
featured: false
draft: false
---

A test-health warning has one job: point at the shard that got slower before a person notices it in the wall clock of a pipeline. The version in [gstack](https://github.com/garrytan/gstack), the Claude Code toolset maintained by Garry Tan, president and CEO of Y Combinator, was comparing two numbers that no longer shared a unit. The fix is small, and the shape of the mistake is worth keeping.

## The two numbers

The checker reads a seed file that records how long each test file takes, then adds those up per shard. That total is `predictedMs`, and it describes serial work: every file run one after another.

The same shard, on CI, runs as several parallel jobs. With the default of four, the shard's wall time is roughly a quarter of the serial sum, not the whole sum.

The old filter compared wall time with the serial sum:

```ts
return timings.filter(
  ({ predictedMs, elapsedMs }) =>
    elapsedMs > predictedMs * SHARD_OVERRUN_FACTOR &&
    elapsedMs - predictedMs >= SHARD_OVERRUN_FLOOR_MS
);
```

With `SHARD_OVERRUN_FACTOR = 1.5` and a floor of 30 seconds, a shard predicted at 400 seconds had to run longer than 600 seconds of wall time before anything printed. But 600 seconds of wall time across four jobs is around 2,400 seconds of serial work. The warning was waiting for a slowdown near six times the real one.

That is the failure mode worth naming: the check was not wrong about the threshold, it was wrong about what the threshold applied to. A quiet dashboard is indistinguishable from a healthy one, so nothing looked broken.

## The fix

One division, in one helper, used by both the filter and the sentence that gets printed:

```ts
const expectedWallMs = ({ predictedMs, jobs }: ShardTiming) =>
  predictedMs / Math.max(1, jobs ?? 1);
```

`jobs` is optional, so a shard that runs as a single job keeps the old meaning and the old behaviour. `Math.max(1, ...)` guards against a zero in the manifest turning the expected time into infinity.

The floor stays in absolute milliseconds. That is deliberate: 30 seconds is a statement about wall time, and it should not be divided by four. Only the multiplication by the factor belongs against the parallel expectation.

The warning text also gained the job count, so a reader can redo the arithmetic without opening the manifest:

> shard 1 took 160s vs 100s predicted across 4 parallel jobs

## The test that pins it

The added test covers both directions, because a fix like this can easily silence the case it was meant to catch:

| elapse | jobs | expected | verdict                        |
| ------ | ---- | -------- | ------------------------------ |
| 610s   | 1    | 400s     | flagged, unchanged from before |
| 590s   | 1    | 400s     | under the factor, quiet        |
| 160s   | 4    | 100s     | flagged, this is the new case  |
| 140s   | 4    | 100s     | 1.4x, under the factor, quiet  |

The fourth row matters as much as the third. A fix that divides the expectation but forgets the factor would flag it, and a warning that fires on a 40 percent spread gets turned off within a week.

## What shipped

The pull request, [#4085](https://github.com/garrytan/gstack/pull/4085), is 4 files and 43 added lines against 8 removed: the helper and the filter in `scripts/lib/free-ci-health.ts`, a 26-line test, a line in `docs/TESTING_INTERNALS.md` explaining that a shard split by `--shard-jobs k` predicts its serial sum divided by k, and a changelog entry. It merged on 6 November 2026, with the free lane reporting 1613 passing tests and no failures.

I did not write that commit. The defect was recorded first by the project's review bot as issue [#3851](https://github.com/garrytan/gstack/issues/3851), and my own attempt, [#4051](https://github.com/garrytan/gstack/pull/4051), proposed the same division at 53 added lines before it was closed rather than merged. The changelog credits that earlier report under this account's previous handle, `@indraoverflow`.

The version that landed is the maintainer's, and it is tighter than mine: same helper, same optional `jobs`, but a single line of documentation instead of a paragraph, which is ten fewer added lines for identical behaviour.

## The rule to carry

Any time work is divided across parallel jobs, duration comparisons need a conversion at the boundary, and the conversion has to appear in three places at once: the threshold, the floor, and the message. Fix only the first and the warning will either stay silent or start crying wolf; fix only the message and nobody can reproduce the number.

The version of this mistake that costs the most is the quiet one. It does not fail a build, so no one investigates, and the slow shard keeps growing until it hits the pipeline's timeout, months later, with no history to point at the file that started it.

The diagram for this piece is short on purpose. One seed number, one division, two verdicts:

<figure>
  <img src="/diagrams/shard-overrun-warning-compared-the-wrong-number-0.svg" alt="A seed predicts 400 seconds of serial work for the shard, which runs as 4 parallel jobs so 100 seconds is the expected wall time. Before, the check compared 160 seconds with 400 seconds and stayed quiet until a six-fold slowdown. After, it compared 160 seconds with 100 seconds, found 1.6 times, and warned." width="653" height="389" loading="lazy" decoding="async">
  <figcaption>The same 160 seconds, two verdicts, one division apart.</figcaption>
</figure>
