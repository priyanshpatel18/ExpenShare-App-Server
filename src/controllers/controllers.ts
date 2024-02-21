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
import {
  History,
  MonthlyHistoryDocument,
  OTP,
  OTPDocument,
  Transaction,
  TransactionDocument,
  User,
  UserData,
  UserDataDocument,
  UserDocument,
} from "../models/models";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET_KEY,
});

const decodeEmail = (token: string) => {
  const decodedToken: string | JwtPayload | null = jwt.verify(
    token,
    String(process.env.SECRET_KEY)
  );
  if (!decodedToken || typeof decodedToken === "string") {
    return "Invalid Token";
  }

  return String(decodedToken.email);
};

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
    });

    await UserData.deleteOne({ userDataId });
    res.status(200).json({
      message: "Account Registered Successfully",
      email: userData.email,
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
        userName: user.userName,
      },
      String(process.env.SECRET_KEY),
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({ token: token, message: "Login Successfully" });
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
  //
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
      return res.status(404).json({ message: "User does not exist" });
    }

    const {
      userName,
      profilePicture,
      totalBalance,
      totalIncome,
      totalExpense,
    } = user;

    const userObject = {
      email: user.email,
      userName,
      profilePicture,
      totalBalance,
      totalIncome,
      totalExpense,
    };

    return res.status(200).json({ userObject });
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

// POST: /transaction/add
export const addTransaction = async (req: Request, res: Response) => {
  const { incomeFlag, token, amount, category, title, notes, transactionDate } =
    req.body;
  const invoice: string | undefined = req.file?.path;

  const email: string = decodeEmail(token);

  const user: UserDocument | null = await User.findOne(
    { email },
    {
      password: 0,
    }
  );
  if (!user) {
    return res.status(401).json({ message: "User not Found" });
  }

  let invoiceUrl: string = "";
  let publicId: string = "";

  if (invoice) {
    const result = await cloudinary.uploader.upload(invoice, {
      folder: "invoices",
    });

    invoiceUrl = result.secure_url;
    publicId = result.public_id;
  }

  try {
    const transactionObject = {
      transactionAmount: String(amount),
      category: String(category),
      transactionTitle: String(title),
      notes: String(notes),
      invoiceUrl,
      publicId,
      transactionDate: String(transactionDate),
      type: incomeFlag,
      createdBy: new Types.ObjectId(user._id),
    };

    const transactionDocument: TransactionDocument = await Transaction.create(
      transactionObject
    );

    const transactionId = new Types.ObjectId(transactionDocument._id);

    const dateForm = new Date(transactionDate);

    const transactionMonth = dateForm.getMonth();
    const transactionYear = dateForm.getFullYear();

    const monthlyHistory: MonthlyHistoryDocument | null =
      await History.findOneAndUpdate(
        {
          user: user._id,
          month: transactionMonth,
          year: transactionYear,
        },
        {
          $inc: {
            income: incomeFlag === "income" ? Number(amount) : 0,
            expense: incomeFlag === "expense" ? Number(amount) : 0,
          },
        },
        { upsert: true, new: true }
      );

    if (monthlyHistory) {
      monthlyHistory.transactionIds.push(transactionId);
      monthlyHistory.monthlyBalance =
        monthlyHistory.income - monthlyHistory.expense;
      await monthlyHistory.save();
    }

    if (incomeFlag === "income") {
      user.incomes.push(transactionId);
      user.totalBalance += Number(amount);
      user.totalIncome += Number(amount);
      // Add to History
    } else if (incomeFlag === "expense") {
      user.expenses.push(transactionId);
      user.totalBalance -= Number(amount);
      user.totalExpense += Number(amount);
    }
    await user.save();

    return res.sendStatus(200);
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST: /transaction/getAll
export const getAllTransactions = async (req: Request, res: Response) => {
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
      return res.status(401).json({ message: "User not Found" });
    }

    const transactions: TransactionDocument[] | null = await Transaction.find({
      createdBy: user._id,
    });

    return res.status(200).json({ transactions });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// PUT: /user/update Update User
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
