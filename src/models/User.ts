import bcrypt from "bcrypt";
import { Document, Schema, Types, model } from "mongoose";

export interface UserDocument extends Document {
  _id: string;
  userName: string;
  email: string;
  password: string;
  profilePicture: string;
  publicId: string;
  expenses: Types.ObjectId[];
  incomes: Types.ObjectId[];
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  groups: Types.ObjectId[];
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
  groups: {
    type: [Types.ObjectId],
    ref: "Group",
    required: true,
    default: [],
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

export const User = model<UserDocument>("User", userSchema)