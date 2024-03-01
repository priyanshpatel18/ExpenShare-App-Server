import { Document, Schema, Types, model } from "mongoose";

export interface GroupTransactionDocument extends Document {
  _id: string;
  groupId: Types.ObjectId;
  paidBy: Types.ObjectId;
  splitAmong: Types.ObjectId[];
  category: string;
  transactionTitle: string;
  transactionAmount: number;
  transactionDate: string;
}

const groupTransactionSchema = new Schema<GroupTransactionDocument>({
  groupId: {
    type: Schema.Types.ObjectId,
    ref: "Group",
    required: true,
  },
  paidBy: {
    type: Schema.Types.ObjectId,
    ref: "GroupUser",
    required: true,
  },
  splitAmong: {
    type: [Schema.Types.ObjectId],
    ref: "GroupUser",
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  transactionTitle: {
    type: String,
    required: true,
  },
  transactionAmount: {
    type: Number,
    required: true,
  },
  transactionDate: {
    type: String,
    required: true,
  },
});

export const GroupTransaction = model(
  "GroupTransaction",
  groupTransactionSchema
);
