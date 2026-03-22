import Redis from "ioredis";

let redis: Redis | null = null;
let redisAvailable = false;
let connectionReported = false;

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0"),
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times >= 3) {
        if (!connectionReported) {
          connectionReported = true;
          console.log("⚠️  Redis connection failed - Running without Redis");
        }
        return null;
      }
      return Math.min(times * 50, 2000);
    },
  });

  redis
    .connect()
    .then(() => {
      redisAvailable = true;
      connectionReported = true;
      console.log("✅ Redis connected");
    })
    .catch(() => {
      redisAvailable = false;
      redis?.disconnect();
      redis = null;
      if (!connectionReported) {
        connectionReported = true;
        console.log("⚠️  Redis not available - Running in fallback mode");
        console.log(
          "   Features disabled: Rate limiting, Session caching, Magic links",
        );
        console.log("   All other features work normally");
        console.log(
          "   💡 Fix: Run Redis via Docker: docker run -d --name redis -p 6379:6379 redis:alpine",
        );
      }
    });

  redis.on("error", () => {
    if (!connectionReported && process.env.NODE_ENV === "development") {
      console.log("⚠️  Redis connection issue (non-critical)");
    }
  });

  redis.on("connect", () => {
    redisAvailable = true;
    connectionReported = true;
  });

  redis.on("close", () => {
    if (redisAvailable) {
      redisAvailable = false;
      console.log("⚠️  Redis connection lost - Switching to fallback mode");
    }
  });

  redis.on("reconnecting", () => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 Redis reconnecting...");
    }
  });
} catch {
  console.log("⚠️  Redis initialization failed - Running without Redis");
  redis = null;
  redisAvailable = false;
}

export { redis, redisAvailable };
