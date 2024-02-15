import bcrypt from "bcrypt";
import ejs from "ejs";
import { Request, Response } from "express";
import otpGenerator from "otp-generator";
import path from "path";
import OTP, { OTPDocument } from "../models/otpModel";
import User, { UserDocument } from "../models/userModel";
import { setToken } from "../service/auth";
import cloudinary from "../utils/cloudinary";
import transporter from "../utils/sendMailUtils";

// POST : /user/register
export const registerUser = async (req: Request, res: Response) => {
  const { userName, email, password } = req.body;
  const profilePicture = req.file?.path;

  let profileUrl = "";
  let publicId = "";

  if (profilePicture) {
    // Upload the file data to Cloudinary
    const result = await cloudinary.uploader.upload(profilePicture, {
      folder: "uploads",
      resource_type: "auto",
    });
    profileUrl = result.secure_url;
    publicId = result.public_id;
  }

  try {
    await User.create({
      email,
      userName,
      profilePicture: profileUrl,
      publicId,
      password,
    });
    //Created User
    res.status(200).json({ message: "Account Registered Successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST : /user/login
export const loginUser = async (req: Request, res: Response) => {
  const { userNameOrEmail, password } = req.body;

  try {
    const user: UserDocument | null = await User.findOne({
      $or: [{ email: userNameOrEmail }, { userName: userNameOrEmail }],
    });

    // Check if User Exist or not
    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }
    // Check Password
    const passwordMatch: boolean = await bcrypt.compare(
      password,
      user.password
    );
    if (!passwordMatch) {
      return res.status(401).json({ message: "Incorrect Password" });
    }
    const token = setToken(user);

    res.status(200).json({ token, message: "Login Successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST : /user/sendMail
export const sendMail = async (req: Request, res: Response) => {
  const { email } = req.body;

  const user: UserDocument | null = await User.findOne({ email });
  // Check for User Existence
  if (!user) {
    return res.status(401).json({ message: "You need to Register First" });
  }

  // Generate OTP and set it in the session
  const otp: string = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
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
    subject: "OTP Verification",
    html: htmlContent,
  };

  // Send Mail Via Transporter
  try {
    await transporter.sendMail(mailOptions);

    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    const otpDocument: OTPDocument = await OTP.create({
      otp: hashedOtp,
      email: email,
    });

    res.status(200).json({
      message: "OTP Sent Successfully",
      otpId: otpDocument._id,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

// POST: /user/verifyOtp
export const verifyOtp = async (req: Request, res: Response) => {
  const { userOtp, otpId } = req.body;

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

    await OTP.deleteOne({ _id: otpId });
    return res.status(200).json({ message: "Create a new Password" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST : /user/verifyMail
export const sendVerifyEmail = async (req: Request, res: Response) => {
  const { email } = req.body;

  // Generate OTP and set it in the session
  const otp: string = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
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

  // Send Mail Via Transporter
  try {
    await transporter.sendMail(mailOptions);

    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    const otpDocument: OTPDocument = await OTP.create({
      otp: hashedOtp,
      email: email,
    });

    res.status(200).json({
      message: "OTP Sent Successfully",
      otpId: otpDocument._id,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { userOtp, otpId } = req.body;

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

    await OTP.deleteOne({ _id: otpId });
    return res.status(200).json({ message: "Email Verified Successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUser = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user: UserDocument | null = await User.findOne({
      $or: [{ email: email }, { userName: email }],
    });

    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }

    return res
      .status(200)
      .json({ profilePicture: user.profilePicture, userName: user.userName });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { password, email } = req.body;

  try {
    const user: UserDocument | null = await User.findOne({ email: email });

    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }

    user.password = password;
    user.save();

    return res.status(200).json({ message: "Password Changed Successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
