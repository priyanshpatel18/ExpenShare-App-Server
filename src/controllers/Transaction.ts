import { UploadApiResponse, v2 as cloudinary } from "cloudinary";
import { Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Types } from "mongoose";
import { History, MonthlyHistoryDocument } from "../models/History";
import { Transaction, TransactionDocument } from "../models/Transaction";
import { User, UserDocument } from "../models/User";

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

// POST: /transaction/delete
export const deleteTransaction = async (req: Request, res: Response) => {
  const { token, transactionId, transactionAmount } = req.body;

  const email: string = decodeEmail(token);

  try {
    const user: UserDocument | null = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const transactionFound =
      user.expenses.includes(transactionId) ||
      user.incomes.includes(transactionId);

    if (!transactionFound) {
      return res.status(401).json({ message: "Transaction not found" });
    }

    const transactionObjectId = new Types.ObjectId(transactionId);
    const amount = Number(transactionAmount);

    const HistoryDocument = await History.findOne({
      transactionIds: transactionObjectId,
    });

    if (!HistoryDocument) {
      return res.status(401).json({ message: "Error finding the History" });
    }

    //Update History Transactions
    HistoryDocument.transactionIds = HistoryDocument.transactionIds.filter(
      (id) => id.toHexString() !== transactionObjectId.toHexString()
    );

    if (user.expenses.includes(transactionId)) {
      // Update User Expense
      user.expenses = user.expenses.filter(
        (id) => id.toHexString() !== transactionObjectId.toHexString()
      );
      user.totalBalance += amount;
      user.totalExpense -= amount;
      // Update History Expense
      HistoryDocument.monthlyBalance += amount;
      HistoryDocument.expense -= amount;
    }

    if (user.incomes.includes(transactionId)) {
      // Update User Incomes
      user.incomes = user.incomes.filter(
        (id) => id.toHexString() !== transactionObjectId.toHexString()
      );
      user.totalBalance -= amount;
      user.totalIncome -= amount;
      //Update History Incomes
      HistoryDocument.monthlyBalance -= amount;
      HistoryDocument.income -= amount;
    }

    await Transaction.findOneAndDelete({
      _id: transactionId,
    });
    await user.save();
    if (HistoryDocument.transactionIds.length === 0) {
      await History.findOneAndDelete({ _id: HistoryDocument._id });
    } else {
      await HistoryDocument.save();
    }

    res.status(200).json({ message: "Transaction deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateTransaction = async (req: Request, res: Response) => {
  const {
    token,
    transactionId,
    transactionAmount,
    category,
    transactionTitle,
    transactionDate,
    type,
    notes,
  } = req.body;
  const invoice: string | undefined = req.file?.path;

  const email = decodeEmail(token);

  if (!email) {
    return res.status(401).json({ message: "Invalid Token" });
  }

  try {
    const user: UserDocument | null = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "User Not Found" });
    }
    console.log(transactionId, typeof transactionId);

    const transaction: TransactionDocument | null = await Transaction.findById({
      _id: transactionId,
    });

    if (type === "income") {
      user.totalIncome -= Number(transaction?.transactionAmount);
      user.totalBalance -= Number(transaction?.transactionAmount);
    } else if (type === "expense") {
      user.totalExpense -= Number(transaction?.transactionAmount);
      user.totalBalance += Number(transaction?.transactionAmount);
    }

    if (!transaction) {
      return res.status(401).json({ message: "Transaction Not Found" });
    }

    transaction.category = category;
    transaction.transactionTitle = transactionTitle;
    transaction.transactionAmount = String(transactionAmount);
    transaction.transactionDate = transactionDate;
    transaction.type = type;
    transaction.notes = notes;

    let profileUrl: string = "";
    let publicId: string = "";

    if (transaction.invoiceUrl.includes("uploads") && invoice) {
      cloudinary.uploader.destroy(transaction.publicId, (error) => {
        if (error) {
          console.log(error);
        }
      });
    }

    if (invoice) {
      const result: UploadApiResponse = await cloudinary.uploader.upload(
        invoice,
        {
          folder: "uploads",
        }
      );

      profileUrl = result.secure_url;
      publicId = result.public_id;

      transaction.invoiceUrl = profileUrl;
      transaction.publicId = publicId;
    }

    if (type === "income") {
      user.totalIncome += Number(transactionAmount);
      user.totalBalance += Number(transactionAmount);
    } else if (type === "expense") {
      user.totalExpense += Number(transactionAmount);
      user.totalBalance -= Number(transactionAmount);
    }

    await user.save();
    await transaction.save();

    const totals = {
      balance: user.totalBalance,
      income: user.totalIncome,
      expense: user.totalExpense,
    };

    res.status(200).json({ totals });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
