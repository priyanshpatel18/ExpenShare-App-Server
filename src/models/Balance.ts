import { Document, Schema, Types, model } from "mongoose";

export interface BalanceDocument extends Document {
  groupId: Types.ObjectId;
  debtorId: Types.ObjectId;
  creditorId: Types.ObjectId;
  amount: number;
}

const balanceSchema = new Schema<BalanceDocument>({
  groupId: {
    type: Schema.Types.ObjectId,
    ref: "Group",
    required: true,
  },
  creditorId: {
    type: Schema.Types.ObjectId,
    ref: "GroupUser",
    required: true,
  },
  debtorId: {
    type: Schema.Types.ObjectId,
    ref: "GroupUser",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
});

export const Balance = model<BalanceDocument>("Balance", balanceSchema);
