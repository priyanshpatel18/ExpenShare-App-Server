import { Document, Schema, Types, model } from "mongoose";

export interface RequestDocument extends Document {
  _id: string;
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  groupId: Types.ObjectId;
  groupName: string;
  status: string;
}

const requestSchema = new Schema<RequestDocument>({
  sender: {
    type: Schema.Types.ObjectId,
    ref: "GroupUser",
  },
  receiver: {
    type: Schema.Types.ObjectId,
    ref: "GroupUser",
  },
  groupId: {
    type: Schema.Types.ObjectId,
    ref: "Group",
    required: true,
  },
  groupName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["PENDING", "ACCEPTED", "REJECTED"],
    default: "PENDING",
  },
});

export const GroupRequest = model<RequestDocument>(
  "GroupRequest",
  requestSchema
);
