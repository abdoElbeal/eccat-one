import "dotenv/config";

import http from "http";
import app from "./app.js";
import connectDB from "./servcies/db/connectDB.js";

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

async function initServer() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(
      `[Server] Running on port ${PORT} — ${process.env.NODE_ENV || "development"} mode`,
    );
  });
}

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`[Server] ${signal} received — shutting down...`);
  server.close(() => {
    console.log("[Server] HTTP server closed.");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000); // Force-exit after 10s
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

initServer();
