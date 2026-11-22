---
title: "Forwarded headers: native strategy vs framework in Spring Boot"
description: "Why balaka sets server.forward-headers-strategy=native instead of framework: scheme redirects, rate-limit keys, and audit-log IPs all depend on which peer you trust. 3 files, +120/-2, 2 tests."
pubDatetime: 2026-11-22T09:00:00+07:00
author: "Indra Prasetya"
category: "security-engineering"
tags:
  - Spring Boot
  - Reverse Proxy
  - Security
  - Java
  - Cloudflare
featured: false
draft: false
---

Forwarded headers are how a reverse proxy tells the backend what the original request looked like. The problem is that anyone can send them. Whether the backend believes them is a trust decision, and the two Spring Boot strategies make opposite choices.

The news this month keeps landing on that boundary. On 5 November 2026, Lauri Koskela published a write-up on lkoskela.fi showing that Rails, Jetty, Spring Boot before 4.2, Symfony, and the Gorilla ProxyHeaders handler all read the RFC 7239 `Forwarded` header and trust it, while almost no proxy or CDN strips it by default (Envoy, ingress-nginx, Traefik, Apache, Caddy, Kong, Cloudflare, CloudFront all pass it through). On dev.to, a 17 November 2026 post on host headers makes the same point for `X-Forwarded-Host`: if the proxy forwards an attacker-controlled value and the application trusts it, absolute URLs, password-reset links, and cache keys follow the attacker. The concrete failure modes are IP allowlists and rate limits bypassed, audit logs poisoned, and password-reset links pointing at an attacker domain.

[artivisi/balaka#58](https://github.com/artivisi/balaka/pull/58), merged 12 November 2026 by maintainer Endy Muhardin, is one small, deliberate choice on that boundary. It sets `server.forward-headers-strategy=native` as the packaged default and documents why it must not be `framework`. The change is 3 files, +120, -2, and replaces a property-read test with one that boots a real Tomcat connector.

## What the two strategies actually do

Spring Boot offers three values for `server.forward-headers-strategy`: `none`, `native`, and `framework`.

- `none`: ignore forwarded headers. Correct when the app is reached directly.
- `native`: hand the headers to Tomcat's `RemoteIpValve`. It rewrites scheme, host, and remote address, but only when the peer is internal or loopback.
- `framework`: Spring's `ForwardedHeaderFilter` does the same rewrite, but trusts `X-Forwarded-*` from any peer that reaches the servlet container.

The difference is one line in the trust check. `framework` is more complete (it also handles `X-Forwarded-Prefix`, which `native` drops), so tutorials often recommend it. The balaka PR chooses `native` anyway, and the reason is in the next section.

## Why native and not framework

`ForwardedHeaderFilter` trusts headers from any client. If a client can reach port 10000 directly, it can send `X-Forwarded-Proto: https` and `X-Forwarded-For: 127.0.0.1` and the application believes it. Two concrete consequences in balaka:

1. Scheme. Without a trusted proxy, the application builds `http://` verification URLs and redirects the device login to the wrong scheme. The test in the PR boots a real Tomcat connector on a random port and POSTs `/api/device/code` from loopback, the position a reverse proxy occupies. With `X-Forwarded-Proto: https` the response's `verificationUri` is `https://<host>:<port>/device`; without the header it stays `http://`.
2. Identity. The rate limiter keys on client IP and the audit log records it. With `framework`, a direct client spoofs both. `native` uses Tomcat's `RemoteIpValve`, which applies the rewrite only for internal and loopback peers, so a direct client's headers are ignored.

The Ansible template `deploy/ansible/roles/app/templates/application.properties.j2` already set `native`, so the packaged default now matches the deployment instead of disagreeing with it.

## The storage path half of the same PR

The same PR makes document storage configurable without editing a packaged file:

```
app.storage.documents.path=${APP_DOCUMENT_STORAGE_PATH:data/documents}
```

A container or a hand-written systemd unit sets `APP_DOCUMENT_STORAGE_PATH=/var/lib/balaka/documents` and the uploads land there. The default is unchanged, so existing deployments keep working. `DocumentStorageServiceTest` already covers where uploads land, so the PR documents the override without adding a property-read test.

## What the tests actually prove

The PR replaces `ApplicationPropertiesTest`, which only started a Spring context to read two property strings back. Its storage assertion was also shadowed by `app.storage.documents.path` in `src/test/resources/application-test.properties`, so it was not testing what it claimed. The replacement, `DeviceAuthForwardedHeadersTest`, talks HTTP to a running server:

- `@SpringBootTest(webEnvironment = RANDOM_PORT)`
- `@ActiveProfiles("test")`
- 2 tests, 0 failures, BUILD SUCCESS
- Command: `./mvnw -Dtest=DeviceAuthForwardedHeadersTest test`

The difference matters for the trust question. A property-read test proves a string; a connector test proves that a header from a loopback peer changes the URL the application emits. The second is the one that catches a regression in which strategy is active.

## Limits

- `native` ignores `X-Forwarded-Prefix`, so URL prefixes are lost if you rely on them. balaka does not use a path prefix, so this is acceptable. If you do, you need `framework` and you must guarantee that no client reaches the container port directly, for example by binding the app to loopback and putting the proxy on the same host.
- `native` trusts loopback. If untrusted code runs on the same host as the app, it can still spoof. The trust boundary is the host, not the process.
- This PR does not address the RFC 7239 `Forwarded` header. Spring Boot's `ForwardedHeaderFilter` and Tomcat's `RemoteIpValve` both handle `X-Forwarded-*` by default; the `Forwarded` header is a separate path that the Koskela write-up flags. If your proxy passes `Forwarded` through, drop or overwrite it at the proxy regardless of which strategy you choose.

## The flow

<figure>
  <img src="/diagrams/forwarded-headers-native-vs-framework-in-spring-boot-0.svg" alt="Trust boundary for forwarded headers: a direct client can spoof X-Forwarded-* into ForwardedHeaderFilter, which trusts any peer; a reverse proxy reaches RemoteIpValve under the native strategy, which trusts only internal and loopback peers, before the rate limiter and audit log." width="1043" height="212" loading="lazy" decoding="async">
  <figcaption>native applies the rewrite only for internal and loopback peers; framework applies it for any peer.</figcaption>
</figure>

## Sources

- PR: https://github.com/artivisi/balaka/pull/58 (merged 12 November 2026, +120/-2, 3 files)
- Koskela, "Spoofed 'Forwarded' header gets past reverse proxies and CDNs" (lkoskela.fi, 5 November 2026)
- dev.to, "Understanding Host Headers..." (17 November 2026)
- dev.to, "nginx as a Reverse Proxy: A Practical Guide for Java and Spring Boot Services" (2026)
