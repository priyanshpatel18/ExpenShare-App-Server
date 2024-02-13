import { Document, Schema, model } from "mongoose";

export interface OTPDocument extends Document {
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

const OTP = model<OTPDocument>("OTP", otpSchema);

export default OTP;
