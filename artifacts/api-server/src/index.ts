import app from "./app";
import { startTeamInactivityScheduler } from "./schedulers/teamInactivity";
import { startRoflCleanupScheduler } from "./schedulers/roflCleanup";

const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  startTeamInactivityScheduler();
  startRoflCleanupScheduler();
});
