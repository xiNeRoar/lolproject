import app from "./app";
import { runStartupMigrations } from "./lib/runStartupMigrations";
import { startTeamInactivityScheduler } from "./schedulers/teamInactivity";
import { startRoflCleanupScheduler } from "./schedulers/roflCleanup";

const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);

// Run migrations BEFORE accepting requests
runStartupMigrations().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    startTeamInactivityScheduler();
    startRoflCleanupScheduler();
  });
}).catch((err) => {
  console.error("Fatal: startup migrations threw unexpectedly:", err);
  // Still start server — migrations are non-fatal
  app.listen(port, () => {
    console.log(`Server listening on port ${port} (migration error occurred)`);
    startTeamInactivityScheduler();
    startRoflCleanupScheduler();
  });
});
