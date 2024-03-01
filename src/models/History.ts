import { Document, Schema, Types, model } from "mongoose";

export interface MonthlyHistoryDocument extends Document {
  _id: string;
  user: Types.ObjectId;
  month: string;
  year: string;
  transactionIds: Types.ObjectId[];
  monthlyBalance: number;
  income: number;
  expense: number;
}

const monthlyHistorySchema = new Schema<MonthlyHistoryDocument>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  month: {
    type: String,
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
  transactionIds: {
    type: [Schema.Types.ObjectId],
    required: true,
  },
  monthlyBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  income: {
    type: Number,
    required: true,
    default: 0,
  },
  expense: {
    type: Number,
    required: true,
    default: 0,
  },
});

export const History = model("History", monthlyHistorySchema);