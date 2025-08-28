// src/lib/db.ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("❌  Please define the MONGODB_URI environment variable");
}

/**
 * Ensure the Mongo connection is cached across HMR reloads in dev
 * to prevent creating new connections on every file change.
 */
declare global {
  var mongooseConn: typeof mongoose | null | undefined;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (global.mongooseConn) return global.mongooseConn;

  global.mongooseConn = await mongoose.connect(MONGODB_URI, {
    dbName: "tikd",
  });

  return global.mongooseConn;
}
