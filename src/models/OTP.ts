import { Document, Schema, model } from "mongoose";

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