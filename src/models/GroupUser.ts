import { Document, Schema, Types, model } from "mongoose";

export interface GroupUserDocument extends Document {
  _id: string;
  userId: Types.ObjectId;
  email: string;
  userName: string;
  profilePicture: string;
  balances: Types.ObjectId[];
}

const groupUserSchema = new Schema<GroupUserDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
    contentType: String,
  },
  balances: {
    type: [Schema.Types.ObjectId],
    ref: "Balance",
    required: true,
  },
});

export const GroupUser = model<GroupUserDocument>("GroupUser", groupUserSchema);