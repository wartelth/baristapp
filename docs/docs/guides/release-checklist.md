---
sidebar_position: 6
title: Release Checklist
---

# Release Checklist

Use this checklist before public GitHub open-source launch and production website/docs publication.

## Product and docs quality

- [ ] Introduction, architecture, security, and usage docs are up to date.
- [ ] All diagrams render in both light and dark themes.
- [ ] Website nav/footer includes links to docs and GitHub.
- [ ] Docs nav/footer includes links to website and GitHub.
- [ ] Naming is consistent (`Baristapp` branding, `SwissKnife` repo context where needed).

## Security and compliance

- [ ] No secrets committed (`.env`, tokens, private keys, credentials).
- [ ] Domain whitelists and capability constraints reviewed.
- [ ] Auth flows tested (JWT path + fallback path, if enabled).
- [ ] Dependency audit run and reviewed.
- [ ] License headers / LICENSE file present and accurate.

## Engineering health

- [ ] Type checks pass for shared/server/app where applicable.
- [ ] Docs build passes with zero broken links.
- [ ] Website build passes.
- [ ] Basic E2E smoke test complete (create + modify flow).
- [ ] README reflects current setup and deployment.

## Open-source readiness

- [ ] `CONTRIBUTING.md` and issue templates added (recommended).
- [ ] Code of Conduct added (recommended).
- [ ] Clear setup steps for contributors.
- [ ] Architecture and safety docs discoverable from README.

## Deployment readiness

- [ ] Website deployed to Vercel production domain.
- [ ] Docs deployed to dedicated docs domain/subdomain.
- [ ] Monitoring and error logging enabled.
- [ ] Rollback plan documented (previous deployment aliases/tags).
