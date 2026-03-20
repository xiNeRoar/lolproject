# VCLoL — Owner's Guide

## Your only job

Tell Claude or Replit to start. They figure out what to do themselves.

**To Claude:**
```
Pull latest variant branch and start working.
```

**To Replit:**
```
Pull latest variant branch and start working.
```

That's it. Each agent runs a script that checks GitHub Issues, finds the next unblocked task assigned to them, reads it, and starts. They open new issues when they find problems, update documentation when things change, and close issues automatically via commit messages.

---

## Reviewing their work

Go to https://github.com/xiNeRoar/lolproject/issues and look at recently closed issues. Each closed issue has Acceptance Criteria in the description. If something isn't right, describe the problem to the agent — they will open a new issue and fix it.

---

## That's all.

Everything else is handled automatically.
