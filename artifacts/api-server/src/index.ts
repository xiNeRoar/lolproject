import app from "./app";

const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
