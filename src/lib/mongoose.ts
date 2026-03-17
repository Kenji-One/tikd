/* ------------------------------------------------------------------ */
/*  src/lib/mongoose.ts                                               */
/* ------------------------------------------------------------------ */
import { connectDB } from "./db";

/**
 * This file is imported for its side-effect of opening (or re-using)
 * the Mongo connection exactly once per Next.js runtime instance.
 */
void connectDB(); // fire-and-forget
