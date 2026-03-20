# VCLoL — How to Use This Project (Owner's Guide)

You are the project owner. You do not need to write code, manage documentation, or open GitHub Issues yourself.

---

## Your Only Commands

### Start a work session

**To Claude:**
```
Pull latest variant branch. Do Issue #1, #2. Read CLAUDE.md and each issue before starting.
```

**To Replit:**
```
Pull latest variant branch. Do Issue #7. Read replit.md and each issue before starting.
```

That's it. Claude and Replit handle everything else automatically:
- Opening new issues when they find problems
- Updating documentation when things change
- Closing issues via commit messages
- Following the correct workflow

---

## What to review when they finish

Go to the GitHub Issue → read the Acceptance Criteria → verify each one is met.
If satisfied → the issue is already closed automatically (via commit message).
If not satisfied → tell the agent what's wrong and ask them to fix it.

---

## GitHub Issues

**View all open issues:** https://github.com/xiNeRoar/lolproject/issues

Issues are organized into milestones:
- **Bot MVP** — build the Discord bot (must complete first)
- **Web V1** — fix website UX + production hardening
- **VOD Pipeline** — automated video generation
- **Polish** — search, enriched data

**You never need to open issues yourself.** If Claude or Replit find a problem, they open the issue. If you notice something wrong, just describe it to Claude or Replit and they will open the issue and fix it.

---

## What order to do things

```
1. Claude: Issue #1, #2          (parser + team matcher)
   Replit: Issue #7              (auth — can do in parallel)

2. Claude: Issue #3, #4, #6     (bot commands — parallel)

3. Claude: Issue #5              (bot /submit — needs #1+#2)
   Claude: Issue #24, #25, #27  (more bot commands — parallel)

4. Claude: Issue #8–#14, #28–#31  (web fixes + production hardening)
   Replit: Issue #16, #17, #18    (web UX improvements)

5. Claude: Issue #14             (captain endpoints)
   Replit: Issue #15             (captain hub — needs #14)

6. Deploy bot → test with real teams

7. Claude: Issue #19             (VOD pipeline)
8. Polish: Issues #20–#23
```

---

## When the bot is ready to deploy

Read `docs/DEPLOYMENT.md` → follow the Pre-Launch Checklist.

---

## That's all you need to know.
