import dotenv from "dotenv";
dotenv.config();

// ─── Env Validation (must run before any imports that read env) ───────────────

const REQUIRED_ENV = [
  "MONGODB_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "SESSION_SECRET",
  "FRONTEND_URL",
  "APP_URL",
];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    "❌ Missing required environment variables:",
    missing.join(", "),
  );
  console.error(
    "Please set these variables in your .env file and restart the server.",
  );
  process.exit(1);
}

// ─── Imports ──────────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import app from "./app";
import { connectDB } from "./config/database";
import { redis } from "./config/redis";
import { initWebhookQueue, shutdownWebhookQueue } from "./queue/webhook.queue";

const PORT = process.env.PORT || 5000;
const DIVIDER = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

// ─── Startup ──────────────────────────────────────────────────────────────────

const startServer = async () => {
  try {
    console.log("🚀 Starting AuthFlow Server...");
    console.log(DIVIDER);

    await connectDB();
    console.log("✅ MongoDB connected");

    initWebhookQueue();

    if (redis) {
      try {
        await redis.ping();
        console.log("✅ Redis connected");
      } catch {
        console.log("⚠️  Redis not available — running without Redis features");
      }
    } else {
      console.log("⚠️  Redis not configured — some features will be disabled");
    }

    const server = app.listen(PORT, () => {
      console.log(DIVIDER);
      console.log(`✨ Server running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🌐 Docs: http://localhost:${PORT}/docs`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(DIVIDER);
    });

    // ─── Graceful Shutdown

    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received — shutting down gracefully...`);

      server.close(async () => {
        console.log("✅ HTTP server closed");

        try {
          await shutdownWebhookQueue();
          console.log("✅ Webhook queue closed");

          if (redis) {
            await redis.quit();
            console.log("✅ Redis closed");
          }

          await mongoose.connection.close();
          console.log("✅ MongoDB closed");

          console.log("👋 Shutdown complete");
          process.exit(0);
        } catch (error) {
          console.error("❌ Error during shutdown:", error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        console.error("⚠️  Forced shutdown after timeout");
        process.exit(1);
      }, 10_000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// ─── Process Error Handlers ───────────────────────────────────────────────────

process.on("unhandledRejection", (err: Error) => {
  console.error("❌ Unhandled Rejection:", err.message);
  console.error(err.stack);
});

process.on("uncaughtException", (err: Error) => {
  console.error("❌ Uncaught Exception:", err.message);
  console.error(err.stack);
});

startServer();
