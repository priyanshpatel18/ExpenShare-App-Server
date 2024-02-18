import bcrypt from "bcrypt";
import { Document, Schema, Types, model } from "mongoose";

export interface UserDocument extends Document {
  _id: string;
  userName: string;
  email: string;
  password: string;
  profilePicture: string;
  publicId: string;
  expenses: [Types.ObjectId];
  incomes: [Types.ObjectId];
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
}

export interface UserDataDocument extends Document {
  _id: string;
  email: string;
  userName: string;
  password: string;
  profilePicture: string;
  createdAt: Date;
}

export interface OTPDocument extends Document {
  otp: string;
  email: string;
  createdAt: Date;
}

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

export interface MonthlyHistoryDocument extends Document {
  _id: string;
  user: Types.ObjectId;
  month: string;
  year: string;
  transactionIds: [Types.ObjectId];
  monthlyBalance: number;
  income: number;
  expense: number;
}

const userSchema = new Schema<UserDocument>({
  userName: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
  },
  profilePicture: {
    type: String,
    contentType: String,
  },
  publicId: {
    type: String,
  },
  expenses: {
    type: [Types.ObjectId],
    ref: "Expense",
    required: true,
  },
  incomes: {
    type: [Types.ObjectId],
    ref: "Income",
    required: true,
  },
  totalBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  totalIncome: {
    type: Number,
    required: true,
    default: 0,
  },
  totalExpense: {
    type: Number,
    required: true,
    default: 0,
  },
});

userSchema.pre<UserDocument>("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.password, salt);
    user.password = hashedPassword;
    next();
  } catch (error) {
    console.log(error);
  }
});

export const User = model("User", userSchema);

const dataSchema = new Schema<UserDataDocument>({
  userName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
  },
  profilePicture: {
    type: String,
    contentType: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600,
  },
});

export const UserData = model<UserDataDocument>("UserData", dataSchema);

const otpSchema = new Schema<OTPDocument>({
  otp: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600,
  },
});

export const OTP = model<OTPDocument>("OTP", otpSchema);

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
