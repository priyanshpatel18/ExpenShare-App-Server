import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

// Configure Transporter
const transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> =
  nodemailer.createTransport({
    service: "gmail",
    host: String(process.env.SMTP_HOST),
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
      user: process.env.USER,
      pass: process.env.PASS,
    },
  });

export default transporter;
