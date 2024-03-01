import { Document, Schema, Types, model } from "mongoose";

export interface BalanceDocument extends Document {
  groupId: Types.ObjectId;
  memberId: Types.ObjectId;
  getsBack: number;
  owes: number;
  paidBy: Types.ObjectId;
}

const balanceSchema = new Schema<BalanceDocument>({
  groupId: {
    type: Schema.Types.ObjectId,
    ref: "Group",
    required: true,
  },
  memberId: {
    type: Schema.Types.ObjectId,
    ref: "GroupUser",
    required: true,
  },
  getsBack: {
    type: Number,
    required: true,
    default: 0,
  },
  owes: {
    type: Number,
    required: true,
    default: 0,
  },
  paidBy: {
    type: Schema.Types.ObjectId,
    ref: "GroupUser",
    required: true,
  },
});

export const Balance = model<BalanceDocument>("Balance", balanceSchema);
