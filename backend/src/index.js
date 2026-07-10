// CodeMap backend - entrypoint
// Week 1 scope: POST /analyze accepts a GitHub URL, safely clones it,
// walks the file tree, and returns the list of JS/TS files.
// (Week 2 will replace the file list with a real dependency graph.)

import express from "express";
import { analyzeRoute } from "./routes/analyze.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Health check - used by Docker healthchecks and uptime monitors later
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "codemap-backend" });
});

app.post("/analyze", analyzeRoute);

app.listen(PORT, () => {
  console.log(`CodeMap backend listening on port ${PORT}`);
});
