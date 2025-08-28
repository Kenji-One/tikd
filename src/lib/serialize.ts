import { Types } from "mongoose";

/** Convert any lean() doc to plain JSON with _id / foreign keys as strings */
export const serialize = <T extends Record<string, any>>(doc: T) => {
  const out: Record<string, any> = {};

  for (const [k, v] of Object.entries(doc)) {
    if (v instanceof Types.ObjectId) {
      out[k] = v.toString();
    } else if (Array.isArray(v)) {
      out[k] = v.map((i) => (i instanceof Types.ObjectId ? i.toString() : i));
    } else {
      out[k] = v;
    }
  }

  return out as unknown as {
    [K in keyof T]: T[K] extends Types.ObjectId ? string : T[K];
  };
};
