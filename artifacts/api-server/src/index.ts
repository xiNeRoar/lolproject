import app from "./app";
import { startNoShowScheduler } from "./schedulers/noShowExpiry";

const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  startNoShowScheduler();
});
