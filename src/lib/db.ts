import mongoose, { type Mongoose } from "mongoose";

type MongooseCache = {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
};

const MONGODB_URI = String(process.env.MONGODB_URI ?? "").trim();
const MONGODB_DB = String(process.env.MONGODB_DB ?? "tikd").trim();

if (!MONGODB_URI) {
  throw new Error("Missing environment variable: MONGODB_URI");
}

declare global {
  var __mongooseCache__: MongooseCache | undefined;
}

const globalForMongoose = globalThis as typeof globalThis & {
  __mongooseCache__?: MongooseCache;
};

const cached: MongooseCache = globalForMongoose.__mongooseCache__ ?? {
  conn: null,
  promise: null,
};

if (!globalForMongoose.__mongooseCache__) {
  globalForMongoose.__mongooseCache__ = cached;
}

export async function connectDB(): Promise<Mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: MONGODB_DB || undefined,
      })
      .then((m) => m)
      .catch((error: unknown) => {
        cached.promise = null;
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
