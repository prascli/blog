---
title: "TOTP second factor, optional per user and required by role"
description: "Adding a TOTP second factor to a Spring Boot app: self-service enrolment, role-required enforcement, attempt limits, replay protection, and hashed single-use recovery codes. 27 files, +2681/-1."
pubDatetime: 2026-11-20T09:00:00+07:00
author: "Indra Prasetya"
category: "security-engineering"
tags:
  - TOTP
  - MFA
  - Spring Boot
  - Security
  - Java
featured: false
draft: false
---

This week the security news is full of authentication being bypassed rather than broken. Hacker News on 20 November 2026 carries Java4Shell (CVE-2026-114938, an OpenJDK Base64 decoder heap overflow reachable without credentials), Ruby2Shell (a one-byte heap overflow in string case conversion reachable on stock Rails without authentication), two critical Nginx RCEs (CVE-2026-123633 and CVE-2026-123007, both unauthenticated and HTTP/2 specific), and a VMware vCenter authentication bypass (CVE-2026-123890, CVSS 9.8). On dev.to the trending MFA cluster for the same week is the same problem from the other side: CVE-2026-107145 (a Roundcube TOTP plugin that did not restrict repeated attempts), CVE-2026-107146 (a session that survived failed verification), CVE-2026-107147 (a whitelist bypass through spoofed client headers), and device code phishing that completes the real MFA prompt on the real Microsoft page. The common thread is that a second factor is only as strong as the checks around it.

[artivisi/balaka#60](https://github.com/artivisi/balaka/pull/60), merged 18 November 2026, is one concrete example of putting those checks in place. It adds a TOTP second factor to the balaka finance application: self-service and optional per user, forced by role through `app.mfa.required-roles`, with attempt limits, replay protection, and hashed single-use recovery codes. The change is 27 files, +2681, -1, with 13 controller tests and a 62-test functional suite that includes a Playwright flow.

## What the feature does

TOTP per RFC 6238: HMAC-SHA1, 6 digits, 30 second period, one step of drift for clock skew. The otpauth URI states the algorithm, digits, and period, so authenticator apps produce codes the service accepts. Enrolment is self-service and optional; `app.mfa.required-roles` forces it per role, and a user is asked to verify before other pages open.

The parts that map onto the bypasses above:

- Attempt limit with a time window. A durable record of failed verification attempts, so the budget cannot be reset by changing session or connection state. This is the control CVE-2026-107145 was missing.
- Replay protection by remembering the last accepted step. A code that was already used is rejected even if it is still inside its 30 second window.
- Single-use recovery codes, stored hashed.
- Refusal to enrol when the encryption key is missing, so a shared secret is never stored in plaintext.

## Why it is one PR and not five

The PR is the fifth and last of the focused PRs requested in balaka issue #42, and it replaces PR #59, which was closed by mistake and could not be reopened because the branch was deleted. The work was resubmitted from the same branch and rewritten to the review notes rather than ported. The original branch forced enrolment on everyone, took the secret from the request, used HMAC-SHA256, and had no attempt limit, no replay protection, and no recovery path. The merged version is the opposite on every point: optional per user, server-generated secret, HMAC-SHA1 per RFC 6238, and the four controls above.

## Tests that had to be fixed before they could run

Two test classes were fixed so they actually exercise the code, and the PR documents each failure mode:

- `@WithUserDetails` resolved principals before `@BeforeEach` created the users, with random names, so every annotated test failed with "User not found". Users are now seeded once per class under the names the annotations use, and re-read per test so a previous method's in-memory MFA flag does not leak.
- MockMvc was built without `CspNonceFilter`, which the layout requires, so every page render failed with "CSP nonce missing".
- The shared test profile sets `app.mfa.enabled=false`, so enrolment threw; these two classes now enable it for themselves.
- The unauthenticated cases assert the 401 the security chain returns, instead of the older redirect expectation.
- The "MFA not required" case used the enrolled admin, so it could never test the redirect; it now uses a non-enrolled staff user.

Verification run locally with Maven 3.9 and Temurin 25 in Docker, PostgreSQL through Testcontainers:

- `MfaControllerTest` and `MfaVerifyControllerTest`: 13 tests, 0 failures.
- `MfaLoginFunctionalTest` and `SecurityRegressionTest` together: 62 tests, 0 failures, Playwright flow included.

## The flow

<figure>
  <img src="/diagrams/totp-second-factor-attempt-limits-and-replay-protection-0.svg" alt="Enrolment and verification sequence: the user requests enrolment, the API generates a secret and stores it encrypted, returns a QR code, then verifies a submitted code with one step of drift; on acceptance the account is marked enrolled and hashed single-use recovery codes are returned, and on attempt-limit exhaustion the API returns 429 within the window." width="1235" height="896" loading="lazy" decoding="async">
  <figcaption>Enrolment and login verification. The attempt limit and replay check live in the verify step, not in the session.</figcaption>
</figure>

## Why this matters this week

The honest link is narrow. The news cycle this week is about MFA being bypassed: replayed or unlimited verification attempts, sessions that survive a failed check, and proxies that complete a real MFA prompt on the user's behalf. None of those are fixed by adding TOTP alone. What fixes them is the verifier refusing to accept a reused code, counting attempts in a durable store, and destroying the session on failure. The balaka PR is the implementation of those three checks in one Spring Boot application, behind a feature flag (`app.mfa.enabled`) and a role list (`app.mfa.required-roles`), with 75 tests. It is a small answer to a large problem, and it is the kind of answer that can be read line by line.

Sources checked on 20 November 2026: trendshift.io/weekly, github.com/trending, news.ycombinator.com (front page), dev.to/trending.

## The rule to carry

When a second factor is added, the verifier has to enforce the assumptions the factor depends on: a durable attempt counter that survives session changes, replay rejection by step, and single-use recovery codes stored hashed. A TOTP implementation that generates codes but does not limit attempts or reject replays gives the appearance of MFA without the property. This PR is 27 files to get those four controls right, and 75 tests to keep them right.
