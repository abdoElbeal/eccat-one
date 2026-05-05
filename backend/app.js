import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

import authRouter    from "./routes/auth.router.js";
import adminRouter   from "./routes/admin.router.js";
import studentRouter from "./routes/student.router.js";
import doctorRouter  from "./routes/doctor.router.js";
import messageRouter from "./routes/message.router.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// ─── 1. Security ─────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,       // Relax for SPA assets & external fonts
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─── 2. Body Parsing ─────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── 3. Static Assets (uploaded files) ───────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: "7d",
  etag: true,
}));

// ─── 4. API Routes ───────────────────────────────────────────────────────────
app.use("/api/auth",     authRouter);
app.use("/api/admin",    adminRouter);
app.use("/api/student",  studentRouter);
app.use("/api/doctor",   doctorRouter);
app.use("/api/messages", messageRouter);

// Health check
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", time: new Date() })
);

// ─── 5. Serve Frontend (production) ──────────────────────────────────────────
const frontendPath = path.join(__dirname, "..", "Frontend");
app.use(express.static(frontendPath, { maxAge: "1d", etag: true }));

// SPA fallback — all non-API routes serve the landing page
// The landing page JS will auto-redirect logged-in users to their dashboard
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(frontendPath, "LandingPage.html"), (err) => {
    if (err) res.status(404).send("Page not found");
  });
});

// ─── 6. Global Error Handler ─────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[Error]", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

export default app;
