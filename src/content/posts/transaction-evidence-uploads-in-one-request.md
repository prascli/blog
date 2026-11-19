---
title: "Transaction evidence uploads now accept several files in one request"
description: "Balaka's evidence form took one file per submission, so a receipt, an invoice and a transfer proof cost three round trips and three audit entries. PR #57 makes uploadForTransaction accept MultipartFile[] and reports partial failures."
pubDatetime: 2026-11-18T09:00:00+07:00
author: "Indra Prasetya"
category: "backend-engineering"
tags:
  - Balaka
  - Spring Boot
  - File Upload
  - HTMX
featured: false
draft: false
---

Balaka's transaction evidence form accepted one file per submission. Attaching a receipt, an invoice and a transfer proof took three round trips and produced three separate audit entries to review. [artivisi/balaka#57](https://github.com/artivisi/balaka/pull/57) changes `DocumentController.uploadForTransaction` to take an optional `MultipartFile[]`, keeps the `evidenceType` submitted with the form, and stores every file in that single request. The change is 4 files, 261 lines added and 19 removed, merged on 15 November 2026.

## What changed

The controller now receives the whole selection at once. A rejected file no longer discards the ones that succeeded: the response reports how many were stored and which files failed, and the evidence panel still refreshes through `HX-Trigger`. Partial failure is still a failure, so the panel stays red whenever any file was rejected.

A selected zero-byte file is reported by `validateFile()` as `File is empty` instead of being silently dropped. Only the browser's nameless placeholder part is skipped. Submitting with nothing selected renders `Tidak ada file yang dipilih` instead of returning a 400.

On the client side the file input becomes `multiple`, lists the selected files with their sizes before submission, and shows a spinner while the upload runs (`hx-indicator`). The list is rendered by the `documentFilePicker` component in `alpine-components.js`, so the same behaviour works on both pages that swap in the fragment: the transaction detail page and the edit form.

## Verification from the PR

The PR was verified with a Docker runner (`maven:3.9-eclipse-temurin-25`, Playwright against a real Tomcat and a Testcontainers Postgres):

```
DocumentControllerFunctionalTest   Tests run: 21, Failures: 0, Errors: 0, Skipped: 0
ServiceDocumentTest                Tests run: 8,  Failures: 0, Errors: 0, Skipped: 0
CspAlpineTest                      Tests run: 15, Failures: 0, Errors: 0, Skipped: 0
Total: 44 tests, BUILD SUCCESS
```

`DocumentControllerFunctionalTest` runs on the edit form, the page the fragment is swapped into, and covers five cases:

1. three files in one request (two PDFs plus a rejected `.sh`): both accepted files stored and listed, the panel is `document-upload-error`, its text counts `2 dokumen berhasil diunggah` and names the rejected file, and the repository holds exactly the two accepted documents;
2. an empty submit: `Tidak ada file yang dipilih`, nothing stored;
3. one rejected file: the validation message alone, with no `Gagal mengunggah dokumen` prefix, nothing stored;
4. every file rejected (wrong type plus spoofed content): `Gagal mengunggah dokumen` naming both files, nothing stored;
5. a zero-byte selected file: `File is empty`, nothing stored.

`CspAlpineTest` re-checks that every `x-data` in the templates is registered in `alpine-components.js` and that the template expressions parse with the CSP build. That test exists because the file picker is shared by two pages, so a registration mistake would surface on one page and not the other.

## Why this matters this week

The week's trending material is dominated by AI agents and the tooling around them on GitHub, and by file handling on dev.to. The dev.to trending clusters checked on 18 November 2026 include "Secure Multi-Tenant File Uploads in Node.js" and "Node.js Secure Tenant File Storage", both groups of posts from the last seven days debating whether uploads should pass through the backend or go straight to object storage, and how to report failures. The honest link is narrow: those clusters are Node-focused, and this PR is a Java and Spring Boot example of the same underlying problem, namely turning several single-file round trips into one request while keeping the failure report honest. The change does not touch object storage or signed URLs; it only removes the repeated round trips and the duplicated audit entries.

Sources checked on 18 November 2026: trendshift.io/weekly, github.com/trending, and dev.to/trending.

## The rule to carry

When a form already accepts one file, extend it to accept many in the same request before adding a second endpoint. Keep the failure report per file, keep partial success visible, and treat an empty selection as a user message rather than a 400. Two tests then cover the two different risks: a functional test that drives the real page and counts stored documents, and a CSP registration test that fails when a shared component is missing on one of the pages that uses it.

The diagram for this piece shows the before and after:

<figure>
  <img src="/diagrams/transaction-evidence-uploads-in-one-request-0.svg" alt="Before: three separate uploads each create their own request and audit entry. After: one MultipartFile array is validated, accepted files are stored, rejected files are reported, the panel refreshes through HX-Trigger, and the panel stays red on any failure." width="620" height="1037" loading="lazy" decoding="async">
  <figcaption>Three round trips become one request, with per-file failure reporting.</figcaption>
</figure>
