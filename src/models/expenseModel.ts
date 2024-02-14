import { Document, Schema, Types, model } from "mongoose";

export interface ExpenseDocument extends Document {
  _id: string;
  expenseTitle: string;
  expenseAmount: string;
  category: string;
  paidTo: string;
  paidBy: Types.ObjectId | null;
  invoice: string;
}

const expenseSchema = new Schema<ExpenseDocument>({
  expenseTitle: {
    type: String,
    required: true,
  },
  expenseAmount: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  paidTo: {
    type: String,
    required: true,
  },
  paidBy: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
  invoice: {
    type: String,
  },
});

const Expense = model<ExpenseDocument>("Expense", expenseSchema);
export default Expense;
