import bcrypt from "bcrypt";
import { UploadApiResponse, v2 as cloudinary } from "cloudinary";
import ejs from "ejs";
import { Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Types } from "mongoose";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import otpGenerator from "otp-generator";
import path from "path";
import { Group, GroupDocument } from "../models/Group";
import { GroupUser, GroupUserDocument } from "../models/GroupUser";
import { OTP, OTPDocument } from "../models/OTP";
import { GroupRequest } from "../models/Request";
import { User, UserDocument } from "../models/User";
import { UserData, UserDataDocument } from "../models/UserData";

export const decodeEmail = (token: string) => {
  const decodedToken: string | JwtPayload = jwt.verify(
    token,
    String(process.env.SECRET_KEY)
  );

  if (!decodedToken || typeof decodedToken === "string") {
    return "Invalid Token";
  }

  return String(decodedToken.email);
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET_KEY,
});

// POST : /user/register
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { userDataId } = req.body;
    const profilePicture: string | undefined = req.file?.path;

    const userData: UserDataDocument | null = await UserData.findOne({
      _id: userDataId,
    });

    if (!userData) {
      return res.status(401).json({ message: "User Data Expired" });
    }

    let profileUrl: string = "";
    let publicId: string = "";

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

    await User.create({
      email: userData.email,
      userName: userData.userName,
      profilePicture: profileUrl,
      publicId,
      password: userData.password,
      groups: [],
    });

    await UserData.deleteOne({ userDataId });

    const token: string = jwt.sign(
      {
        email: userData.email,
      },
      String(process.env.SECRET_KEY)
    );

    res.status(200).json({
      message: "Account Registered Successfully",
      token,
    });
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

    const token: string = jwt.sign(
      {
        email: user.email,
      },
      String(process.env.SECRET_KEY)
    );

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

  // Send Mail Via Transporter
  try {
    await transporter.sendMail(mailOptions);

    const salt: string = await bcrypt.genSalt(10);
    const hashedOtp: string = await bcrypt.hash(otp, salt);

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
    res.status(500).json({ message: "Internal Server Error" });
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
    return res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST : /user/verifyMail
export const sendVerifyEmail = async (req: Request, res: Response) => {
  const { email, userName, password, selectedImage } = req.body;

  const user: UserDocument | null = await User.findOne({
    $or: [{ email: email }, { userName: userName }],
  });
  if (user?.email === email) {
    res.status(401).json({ message: "Email should be unique" });
  }
  if (user?.userName === userName) {
    res.status(401).json({ message: "Username should be unique" });
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
    subject: "Email Verification",
    html: htmlContent,
  };

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

  // Send Mail Via Transporter
  try {
    await transporter.sendMail(mailOptions);

    const salt: string = await bcrypt.genSalt(10);
    const hashedOtp: string = await bcrypt.hash(otp, salt);

    const otpDocument: OTPDocument = await OTP.create({
      otp: hashedOtp,
      email: email,
    });

    const UserDataDocument: UserDataDocument = await UserData.create({
      email,
      userName,
      password,
      profilePicture: selectedImage,
    });

    res.status(200).json({
      message: "OTP Sent Successfully",
      otpId: otpDocument._id,
      userDataId: UserDataDocument._id,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST: /user/getUser
export const getUser = async (req: Request, res: Response) => {
  const { token } = req.body;

  const email: string = decodeEmail(token);

  try {
    const user: UserDocument | null = await User.findOne(
      { email },
      {
        password: 0,
      }
    );

    if (!user) {
      return res.status(404).json({ message: "User not verified" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST: /user/resetPassword
export const resetPassword = async (req: Request, res: Response) => {
  const { password, email } = req.body;

  try {
    const user: UserDocument | null = await User.findOne(
      { email: email },
      {
        password: 0,
      }
    );

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

// POST: /user/update
export const updateUser = async (req: Request, res: Response) => {
  const { token, userName } = req.body;
  const profilePicture = req.file?.path;

  const email: string = decodeEmail(token);

  try {
    const user: UserDocument | null = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (userName) {
      user.userName = userName;
    }
    if (user.publicId.includes("uploads") && profilePicture) {
      cloudinary.uploader.destroy(user.publicId, (error) => {
        if (error) {
          console.log(error);
        }
      });
    }

    let profileUrl: string = "";
    let publicId: string = "";

    if (profilePicture && user) {
      const result: UploadApiResponse = await cloudinary.uploader.upload(
        profilePicture,
        {
          folder: "uploads",
        }
      );

      profileUrl = result.secure_url;
      publicId = result.public_id;

      user.profilePicture = profileUrl;
      user.publicId = publicId;
    }
    await user.save();

    res.status(200).json({ message: "User Updated Successfully", profileUrl });
  } catch (error: any) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.userName) {
      return res.status(401).json({ message: "Username should be unique" });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST: /user/delete
export const deleteUser = async (req: Request, res: Response) => {
  const { token } = req.body;

  const email: string = decodeEmail(token);

  try {
    const deletedUser = await User.findOneAndDelete({ email });

    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllNotifications = async (req: Request, res: Response) => {
  const { token } = req.body;

  const email: string = decodeEmail(token);

  try {
    const user: UserDocument | null = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "User Not Found" });
    }

    const requests = await GroupRequest.find({
      receiver: user._id,
      status: "PENDING",
    });

    const notifications = requests.map((request) => ({
      requestId: request._id,
      groupName: request.groupName,
      groupId: request.groupId,
    }));

    res.status(200).json({ notifications });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const handleRequest = async (req: Request, res: Response) => {
  const { token, requestId, type } = req.body;

  const email: string = decodeEmail(token);

  try {
    const user: UserDocument | null = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "User Not Found" });
    }

    const request = await GroupRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request Not Found" });
    }

    const group: GroupDocument | null = await Group.findById(request.groupId);

    if (!group) {
      return res.status(404).json({ message: "Group doesn't exist" });
    }

    if (type === "accept" && request.receiver) {
      request.status = "ACCEPTED";
      group.members.push(request.receiver);
      user.groups.push(request.groupId);

      const existingGroupUser: GroupUserDocument | null =
        await GroupUser.findOne({
          email: user.email,
        });
      if (!existingGroupUser) {
        // Create a new GroupUser if it doesn't exist
        await GroupUser.create({
          _id: new Types.ObjectId(user._id),
          userId: new Types.ObjectId(user._id),
          email: user.email,
          userName: user.userName,
          profilePicture: user.profilePicture,
          expenses: [],
        });
      }
    } else if (type === "reject") {
      request.status = "REJECTED";
    }

    await user.save();
    await group.save();
    await request.save();

    return res.sendStatus(200);
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
