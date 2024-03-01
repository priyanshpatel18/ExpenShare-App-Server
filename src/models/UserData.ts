import { Document, Schema, model } from "mongoose";

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
