import bcrypt from "bcrypt";
import { UploadApiResponse } from "cloudinary";
import ejs from "ejs";
import { Request, Response } from "express";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import otpGenerator from "otp-generator";
import path from "path";
import OTP, { OTPDocument } from "../models/otpModel";
import User, { UserDocument } from "../models/userModel";
import { setToken } from "../service/auth";
import cloudinary from "../utils/cloudinary";

// POST : /user/v1/register
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, userName, password } = req.body;
    const profilePicture = req.file?.path;
    let profileUrl = "";
    let publicId = "";

    if (profilePicture) {
      const result: UploadApiResponse = await cloudinary.uploader.upload(
        profilePicture,
        {
          folder: "uploads",
        }
      );
      profileUrl = result.secure_url;
      publicId = result.public_id;
    }

    const user: UserDocument | null = await User.findOne({
      $or: [{ email: email }, { userName: userName }],
    });
    // Check for unique Email
    if (user?.email === email) {
      return res.status(400).send("Email should be unique");
    }
    // Check for unique userName
    if (user?.userName === userName) {
      return res.status(400).send("Username should be unique");
    }

    // Create User if passed all checks
    User.create({
      email,
      userName,
      profilePicture: profileUrl,
      publicId,
      password,
    });

    res.status(200).send("User registered successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

// POST: /user/v1/login
export const loginUser = async (req: Request, res: Response) => {
  const { userNameOrEmail, password } = req.body;

  try {
    const user: UserDocument | null = await User.findOne({
      $or: [{ email: userNameOrEmail }, { userName: userNameOrEmail }],
    });

    // Check if User Exist or not
    if (!user) {
      return res.status(401).send("You need to Register First");
    }

    // Comapre the Password using bcrypt
    const passwordMatch: boolean = await bcrypt.compare(
      password,
      user.password
    );
    if (!passwordMatch) {
      res.status(501).send("Incorrect Password");
      return;
    } else {
      // Set Token in Cookies if password is correct
      const token = setToken(user);
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      res.status(201).send("Login Successfully");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

// POST: /user/v1/verifyEmail
export const verifyEmail = async (req: Request, res: Response) => {
  const { email } = req.body;

  // Generate OTP and set it in the session
  const otp: string = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  // Configure Transporter
  const transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> =
    nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });

  // Render EJS Template
  const templatePath: string = path.resolve(
    __dirname,
    "../views/mailFormat.ejs"
  );
  const htmlContent: string = await ejs.renderFile(templatePath, { otp });

  // Send Email
  const mailOptions = {
    from: String(process.env.USER),
    to: email,
    subject: "Email Verification",
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);

    // Hash OTP and save it in the database
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    const otpDocument: OTPDocument = await OTP.create({
      otp: hashedOtp,
      email: email,
    });

    // Set the OTP ID in the cookies
    res.cookie("otpId", otpDocument._id, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.status(200).json({ message: "OTP Sent Successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

// POST: /user/v1/verifyOtp
export const verifyOtp = async (req: Request, res: Response) => {
  const { userOtp, otpId } = req.body;

  // Verify OTP
  try {
    // Find the OTP document in the database by its ID
    const otp: OTPDocument | null = await OTP.findById(otpId);

    // Check if the OTP document exists
    if (!otp) {
      return res.status(404).json({ message: "OTP not found" });
    }

    // Compare the user-provided OTP with the OTP from the database
    const isVerified: boolean = await bcrypt.compare(userOtp, otp.otp);

    if (!isVerified) {
      return res.status(401).json({ message: "Incorrect OTP" });
    }

    // Set Email in the cookies
    res.cookie("email", otp.email, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    // Clear Cookie and delete the OTP from the database
    res.clearCookie("otpId");
    await OTP.deleteOne({ _id: otpId });

    return res.status(200).json({ message: "Create a new Password" });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
};

// GET: /user/v1/getUser
export const getUser = async (req: Request, res: Response) => {
  const user: UserDocument = req.user;

  try {
    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal server error");
  }
};
