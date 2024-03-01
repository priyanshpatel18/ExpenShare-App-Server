import { Document, Schema, Types, model } from "mongoose";

export interface GroupDocument extends Document {
  groupName: string;
  groupProfile: string;
  publicId: string;
  createdBy: Types.ObjectId;
  members: Types.ObjectId[];
  groupTransactions: Types.ObjectId[];
  totalExpense: number;
  category: string;
}

const groupSchema = new Schema<GroupDocument>({
  groupName: {
    type: String,
    required: true,
  },
  groupProfile: {
    type: String,
  },
  publicId: {
    type: String,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "GroupUser",
    required: true,
  },
  members: {
    type: [Schema.Types.ObjectId],
    ref: "GroupUser",
    default: [],
  },
  groupTransactions: {
    type: [Schema.Types.ObjectId],
    ref: "GroupTransaction",
    default: [],
  },
  totalExpense: {
    type: Number,
    required: true,
    default: 0,
  },
  category: {
    type: String,
    default: "NONE",
  },
});

export const Group = model<GroupDocument>("Group", groupSchema);
