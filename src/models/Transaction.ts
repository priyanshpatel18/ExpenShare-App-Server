import { Document, Schema, Types, model } from "mongoose";

export interface TransactionDocument extends Document {
  _id: string;
  transactionAmount: string;
  category: string;
  transactionTitle: string;
  notes: string;
  invoiceUrl: string;
  publicId: string;
  transactionDate: string;
  type: string;
  createdBy: Types.ObjectId;
}

const transactionSchema = new Schema<TransactionDocument>({
  transactionAmount: {
    type: String,
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
  notes: {
    type: String,
  },
  invoiceUrl: {
    type: String,
  },
  publicId: {
    type: String,
  },
  transactionDate: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

export const Transaction = model<TransactionDocument>(
  "Transaction",
  transactionSchema
);
