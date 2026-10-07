# calgovcc CLAUDE.md

@../CLAUDE.md

## Repo
- GitHub: github.com/Aproposchpt2/calgovcc
- Production branch: `main`

## Deploy pipeline — CORRECTED 2026-07-16, RE-VERIFIED 2026-10-07, this repo does NOT auto-deploy
- **This repo has no linked Netlify site.** Pushing to `main` here does nothing in production.
- **The site id `35650334-7d30-459f-8369-8f5bbc7350ec` has been renamed twice since this section was first written: `cal-gov-contract-center` → now `national-corp-contract-exchange`, serving `natcorp.aproposgroupllc.com`.** The GitHub repo behind it is now `Aproposchpt2/NAT-CORP-CONTRACT-EXCHANGE`, not `CAL-GOV-CONTRACT-CENTER` (that repo name no longer exists — see `NAT-CORP-CONTRACT-EXCHANGE/CLAUDE.md`'s own "Naming history" section). Re-confirmed 2026-10-07 by matching that Netlify project's live `commit_ref` against `NAT-CORP-CONTRACT-EXCHANGE`'s own git log.
- Practical effect: **`calgovcc` is effectively a dead/orphaned repo as far as production is concerned.** Any change meant to reach production must be manually ported to `NAT-CORP-CONTRACT-EXCHANGE` and committed/pushed there — this repo's git history does not reach the live site on its own. See `NAT-CORP-CONTRACT-EXCHANGE/CLAUDE.md` for that repo's real deploy pipeline.
- Do not assume any repo's CLAUDE.md deploy section is accurate without verifying against the live Netlify project list first — this file's own history is the proof why.

## Known incident (context, not a standing rule)
- Commit `87e83e5` was a rebuild that broke production. Reset back to `c9930a1` (last known good) on 2026-07-15. If `87e83e5`'s changes are ever needed again, they're recoverable from a pre-reset local clone via `git show 87e83e5`, but not from a fresh clone post-GC.
- **Caveat added 2026-07-16:** given the deploy-pipeline finding above, it's unclear this "production" incident ever affected the live site at all — re-verify against `NAT-CORP-CONTRACT-EXCHANGE` history (the renamed repo, see Deploy pipeline above) if this ever needs to be reasoned about again.

## Environment quirk — bash cwd silently resets
- In this environment, the Bash tool's working directory **does not persist reliably across calls** — it has been observed silently resetting to `C:\Users\Jeff\repos\calgovcc` between commands, even after an explicit `cd` into a different repo. This caused a real incident (2026-07-16): a `cd` into `CAL-GOV-CONTRACT-CENTER` silently reverted, later commands executed against `calgovcc` instead, and a Netlify status check reported the wrong (unrelated) linked site as a result — contributing to hours of work being applied to the wrong repo before it was caught.
- **Standing rule: when working across multiple repos in this workspace, prefix every single command with an explicit `cd "<full path>"` and verify with `pwd` (and `git remote -v` for git operations) in the *same* command/output — every time, never assume the prior `cd` held.**

## Repo-specific notes
<!-- Add stack, build commands, and conventions here as they're established. -->
