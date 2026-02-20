---
sidebar_position: 5
title: Hosting Docs
---

# Hosting Docs

If your website is on Vercel, the cleanest setup is to host docs on a dedicated Vercel project and subdomain.

## Recommended setup

- Website: `baristapp.vercel.app` (or your custom apex domain)
- Docs: `docs.baristapp.dev` (separate Vercel project pointing to `docs/`)
- Repo: open source on GitHub (single monorepo)

This keeps Next.js website and Docusaurus docs independent, easier to deploy and rollback.

## Option A (best): Separate Vercel project for `docs/`

1. In Vercel, create a new project from this repository.
2. Set **Root Directory** to `docs`.
3. Build command: `npm run build`.
4. Output directory: `build`.
5. Add domain/subdomain (for example `docs.baristapp.dev`).
6. Add an env var only if your docs build requires one (usually none).

### Why this is best

- Independent deployments for docs and marketing site.
- Cleaner CI/CD and fewer cross-project breakages.
- Easy to lock docs to tagged versions in the future.

## Option B: Host docs with GitHub Pages

Use Docusaurus built-in deployment flow to `gh-pages`. Good for low-cost public docs, less integrated than Vercel.

## Option C: Serve docs under the website app

Possible but not ideal for this stack because it mixes Next.js and Docusaurus build artifacts and complicates routing/cache strategy.

## Add links between website and docs

- Put a `Docs` link in website navbar/footer.
- Put a `Website` link in docs navbar/footer.
- Keep product naming consistent across both.

## Production checklist

- HTTPS enabled on docs domain.
- Broken links fail the build (`onBrokenLinks: "throw"` already enabled).
- `robots.txt` and sitemap generated.
- OpenGraph metadata configured for docs pages.
- Version tagging plan decided (single docs stream vs versioned docs).
