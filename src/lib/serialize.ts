// src/lib/serialize.ts
import { Types } from "mongoose";

/** Convert any lean() doc to plain JSON with _id / foreign keys as strings */
type Serialized<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends Types.ObjectId
    ? string
    : T[K] extends (infer U)[]
      ? U extends Types.ObjectId
        ? string[]
        : T[K]
      : T[K];
};

const isObjectId = (val: unknown): val is Types.ObjectId =>
  val instanceof Types.ObjectId;

export const serialize = <T extends Record<string, unknown>>(
  doc: T
): Serialized<T> => {
  const out: Partial<Record<keyof T, unknown>> = {};

  for (const key in doc) {
    const v = doc[key];
    if (isObjectId(v)) {
      out[key] = v.toString();
    } else if (Array.isArray(v)) {
      out[key] = v.map((i) => (isObjectId(i) ? i.toString() : i)) as unknown;
    } else {
      out[key] = v;
    }
  }

  return out as Serialized<T>;
};
