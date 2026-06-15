# Repo & Release Organization — Design

**Date:** 2026-06-15
**Status:** Approved, pending execution
**Repo:** `sclibraries/gadgets-to-go`

## Goal

Organize the repository so that:
- **External institutions & public visitors** land on the configurable distribution (the shareable product) with a clear README and versioned releases.
- **The team** has one unambiguous branch for the Five Colleges production line.
- **Any version is reproducible** via tagged GitHub Releases with changelogs.

## Decisions

- The Five Colleges line and the configurable distribution stay **two separate codebases**, maintained independently. Fixes/features are ported by hand as needed.
- **One repo**, with the configurable distribution as the default front door (Approach 1).
- Production deploys via **manual `npm run build` + upload of `dist/`** — no host watches `origin/main`, so branch reorganization does not affect production.

## Target structure

| Branch | Content | Audience |
|---|---|---|
| `main` (default) | Configurable distribution (fast-forwarded to `cf01fb2`) | Institutions, public |
| `five-colleges` | Team production line (reconstruction, `9c7005d`) | Team |
| `package-config-hardening`, `distribution/v1-configurable` | **Retired** — superseded by `main` | — |

Notes:
- `main` (`557a41d`, old Nov-2025 app) fast-forwards to `cf01fb2` — the configurable line is a linear descendant, so **no force-push / no history rewrite**.
- `five-colleges` shares ancestor `557a41d` and diverges (it has the reconstruction commit, not the configurable commits). This divergence is intended.
- The old `main` commit is preserved as the shared ancestor; optionally tagged `legacy/2025-11`.

## Releases & versioning

Two non-colliding tag tracks in the one repo:
- **Distribution:** plain semver `v1.0.0`, `v1.1.0`, … cut from `main`. Shown as headline "Latest" releases.
- **Five Colleges:** prefixed `fc-v1.0.0`, … cut from `five-colleges`.

Each release gets a GitHub Release with a short changelog.

## Discoverability

`main`'s `README` becomes institution-facing: what Gadgets-to-Go is, how to deploy the
configurable version (Docker + config YAML), a link to Releases, and a pointer to the
`five-colleges` branch as a real-world reference deployment.

## Migration runbook

All steps non-destructive except the two branch deletions (step 6).

1. **Push `five-colleges` to origin** (currently local-only).
2. **Fast-forward `main` → `cf01fb2`**, push. (Clean fast-forward.)
3. **Confirm GitHub default branch = `main`.**
4. **Tag + Release:** `v1.0.0` on `main` (distribution); `fc-v1.0.0` on `five-colleges`. Create GitHub Releases with changelogs.
5. **Rewrite `main`'s README** to be institution-facing.
6. **Delete** `package-config-hardening` and `distribution/v1-configurable` (local + origin).
7. **(Optional)** tag `legacy/2025-11` on the old main commit; clean untracked cruft
   (`backend/`, `.env.staging`, the `.sql` dump, stray screenshots) from working trees.

## Risks / notes

- Steps touching origin (2, 4, 6) and GitHub settings (3) are outward-facing; confirm before each.
- Default-branch change and Release creation may require the GitHub UI or `gh` CLI.
- Five Colleges follow-ups tracked separately: set `VITE_AUTH_URL` for staff login;
  spot-check reconstructed branch/location codes against production data.
