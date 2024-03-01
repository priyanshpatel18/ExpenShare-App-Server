import { Document, Schema, Types, model } from "mongoose";

export interface BalanceDocument extends Document {
  groupId: Types.ObjectId;
  debtorIds: Types.ObjectId[];
  creditorId: Types.ObjectId;
  amount: number;
  settled: boolean;
  date: string;
}

const balanceSchema = new Schema<BalanceDocument>({
  groupId: {
    type: Schema.Types.ObjectId,
    ref: "Group",
    required: true,
  },
  debtorIds: [
    {
      type: Schema.Types.ObjectId,
      ref: "GroupUser",
      required: true,
    },
  ],
  creditorId: {
    type: Schema.Types.ObjectId,
    ref: "GroupUser",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  settled: {
    type: Boolean,
    required: true,
    default: false,
  },
  date: {
    type: String,
    required: true,
  },
});

export const Balance = model<BalanceDocument>("Balance", balanceSchema);
