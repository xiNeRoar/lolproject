# docs/REQUESTS.md — Backend Requests from Replit

Use this file when you need Claude to add or change a backend endpoint.
Format: one section per request.

---

## Bug: API Server crashes on startup — `__dirname` not defined + Express 5 wildcard syntax

**File:** `artifacts/api-server/src/app.ts`

**Problem 1 — `__dirname` in ESM:**
Line 20 uses `__dirname` which is not available in ES modules. The server crashes immediately on startup with:
```
ReferenceError: __dirname is not defined in ES module scope
```

**Fix:** Add ESM-compatible `__dirname` polyfill at the top of the file:
```ts
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

**Problem 2 — Express 5 wildcard `*` path:**
Line 74 uses `app.get("*", ...)` which throws in Express 5 / `path-to-regexp@8`:
```
PathError [TypeError]: Missing parameter name at index 1: *
```

**Fix:** Change to the Express 5 canonical form:
```ts
app.get("/{*path}", (_req, res) => {
```

**Priority:** Critical — API server cannot start at all until both are fixed.
