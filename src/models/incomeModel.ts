import { Document, Schema, model } from "mongoose";

export interface IncomeDocument extends Document {
  _id: string;
  incomeTitle: string;
  incomeAmount: string;
  paidBy: string;
  invoice: string;
}

const incomeSchema = new Schema<IncomeDocument>({
  incomeTitle: {
    type: String,
    required: true,
  },
  incomeAmount: {
    type: String,
    required: true,
  },
  paidBy: {
    type: String,
    required: true,
  },
  invoice: {
    type: String,
  },
});

const Income = model<IncomeDocument>("Expense", incomeSchema);
export default Income;
