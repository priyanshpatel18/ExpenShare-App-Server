import bcrypt from "bcrypt";
import { Document, Schema, Types, model } from "mongoose";

// -----------USER-----------
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

// -----------USERDATA-----------
export interface UserDataDocument extends Document {
  _id: string;
  email: string;
  userName: string;
  password: string;
  profilePicture: string;
  createdAt: Date;
}

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

// -----------OTP-----------
export interface OTPDocument extends Document {
  _id: string;
  otp: string;
  email: string;
  createdAt: Date;
}

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

// -----------TRANSACTION-----------
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

// -----------HISTORY-----------
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

// -----------GROUP-TRANSACTION-----------

export interface GroupTransactionDocument extends Document {
  _id: string;
  groupId: Types.ObjectId;
  paidBy: Types.ObjectId;
  splitAmong: [Types.ObjectId];
  category: string;
  transactionTitle: string;
  notes: string;
  invoiceUrl: string;
  publicId: string;
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
    ref: "User",
    required: true,
  },
  splitAmong: {
    type: [Schema.Types.ObjectId],
    ref: "User",
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
});

export const GroupTransaction = model(
  "GroupTransaction",
  groupTransactionSchema
);

const groupSchema = new Schema({
  groupName: {
    type: String,
    required: true,
  },
  groupProfile: {
    type: String,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  members: {
    type: [Schema.Types.ObjectId],
    ref: "User",
    default: [],
  },
  groupExpense: {
    type: [Schema.Types.ObjectId],
    ref: "GroupTransaction",
    default: [],
  },
  totalExpense: {
    type: Number,
    required: true,
    default: 0,
  },
});

export const Group = model("Group", groupSchema);
