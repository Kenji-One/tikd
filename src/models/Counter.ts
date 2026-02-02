// src/models/Counter.ts
import { Schema, model, models, type Model } from "mongoose";

export interface ICounter {
  _id: string; // sequence key
  seq: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

const Counter: Model<ICounter> =
  (models.Counter as Model<ICounter>) ||
  model<ICounter>("Counter", CounterSchema);

export default Counter;

export async function getNextSequence(key: string): Promise<number> {
  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
    .select({ seq: 1 })
    .lean<{ seq: number }>()
    .exec();

  return doc?.seq ?? 1;
}
