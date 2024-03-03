import { UploadApiResponse, v2 as cloudinary } from "cloudinary";
import { Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Types } from "mongoose";
import { emailToSocketMap, io } from "..";
import { Balance, BalanceDocument } from "../models/Balance";
import { Group, GroupDocument } from "../models/Group";
import { GroupUser, GroupUserDocument } from "../models/GroupUser";
import { User, UserDocument } from "../models/User";
import {
  GroupTransaction,
  GroupTransactionDocument,
} from "../models/GroupTransaction";

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

// POST: /group/create
export const createGroup = async (req: Request, res: Response) => {
  const { groupName, category, token } = req.body;
  const groupProfile = req.file?.path;

  const email: string = decodeEmail(token);

  try {
    const user: UserDocument | null = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "User Not Found" });
    }

    let profileUrl: string = "";
    let publicId: string = "";

    if (groupProfile) {
      const result: UploadApiResponse = await cloudinary.uploader.upload(
        groupProfile,
        {
          folder: "uploads",
        }
      );
      profileUrl = result.secure_url;
      publicId = result.public_id;
    }

    let existingGroupUser: GroupUserDocument | null;
    existingGroupUser = await GroupUser.findOne({
      email: user.email,
    });
    if (!existingGroupUser) {
      // Create a new GroupUser if it doesn't exist
      existingGroupUser = await GroupUser.create({
        userId: new Types.ObjectId(user._id),
        email: user.email,
        userName: user.userName,
        profilePicture: user.profilePicture,
        expenses: [],
      });
    }

    const newGroup = {
      groupName,
      groupProfile: groupProfile ? profileUrl : "",
      publicId: publicId.trim() ? publicId : "",
      createdBy: existingGroupUser._id,
      members: [existingGroupUser._id],
      groupExpense: [],
      totalExpense: 0,
      category: category,
    };

    const GroupDoc: GroupDocument = await Group.create(newGroup);

    user.groups.push(GroupDoc._id);
    await user.save();

    const groupUser = {
      email: user.email,
      userName: user.userName,
      profilePicture: user.profilePicture,
    };

    const responseGroup = {
      _id: GroupDoc._id,
      groupName,
      groupProfile: groupProfile ? profileUrl : "",
      createdBy: groupUser,
      members: [groupUser],
      groupExpenses: [],
      totalExpense: 0,
      category: category,
    };

    return res
      .status(200)
      .json({ message: "Created Successfully", group: responseGroup });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllGroups = async (req: Request, res: Response) => {
  const { token } = req.body;

  const email: string = decodeEmail(token);

  try {
    const user: UserDocument | null = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "User Not Found" });
    }

    const groupUser: GroupUserDocument | null = await GroupUser.findOne({
      email: user.email,
    });

    if (!groupUser) {
      return res.status(200).json({ message: "User has no groups" });
    }

    const groups: GroupDocument[] | null = await Group.find({
      members: { $in: groupUser._id },
    });

    const allGroupUsers: GroupUserDocument[] | null = await GroupUser.find();
    const allGroupTransactions: GroupTransactionDocument[] | null =
      await GroupTransaction.find({
        groupId: { $in: groups.map((group) => group._id) },
      });
    const allBalances: BalanceDocument[] | null = await Balance.find({
      groupId: { $in: groups.map((group) => group._id) },
    });

    const mappedGroups = groups.map((group) => ({
      _id: group._id,
      groupName: group.groupName,
      groupProfile: group.groupProfile ? group.groupProfile : undefined,
      createdBy: allGroupUsers.find((user) =>
        new Types.ObjectId(user._id).equals(group.createdBy)
      ),
      members: allGroupUsers.filter((user) => {
        const userId = new Types.ObjectId(user._id);
        return group.members.some((memberId) => userId.equals(memberId));
      }),
      balances: allBalances.map((balance) => ({
        _id: balance._id,
        groupId: balance.groupId,
        debtor: allGroupUsers.find((user) =>
          new Types.ObjectId(user._id).equals(balance.debtorId)
        ),
        creditor: allGroupUsers.find((user) =>
          new Types.ObjectId(user._id).equals(balance.creditorId)
        ),
        amount: balance.amount,
      })),
      groupExpenses: allGroupTransactions
        .filter((transaction) => transaction.groupId.equals(group._id))
        .map((transaction) => ({
          _id: transaction._id,
          groupId: transaction.groupId,
          paidBy: allGroupUsers.find((user) =>
            new Types.ObjectId(user._id).equals(transaction.paidBy)
          ),
          splitAmong: transaction.splitAmong.map((memberId) =>
            allGroupUsers.find((user) =>
              new Types.ObjectId(user._id).equals(memberId)
            )
          ),
          category: transaction.category,
          transactionTitle: transaction.transactionTitle,
          transactionAmount: transaction.transactionAmount,
          transactionDate: transaction.transactionDate,
        })),
      totalExpense: group.totalExpense,
    }));

    res.status(200).json({ groups: mappedGroups });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const removeMember = async (req: Request, res: Response) => {
  const { token, memberEmail, groupId } = req.body;

  const userEmail: string = decodeEmail(token);

  try {
    const user: UserDocument | null = await User.findOne({ email: userEmail });

    if (!user) {
      return res.status(401).json({ message: "User Not Found" });
    }

    const group: GroupDocument | null = await Group.findById({ _id: groupId });

    if (!group) {
      return res.status(404).json({ message: "Group doesn't exist" });
    }

    const groupUser: GroupUserDocument | null = await GroupUser.findOne({
      email: memberEmail,
    });

    group.members = group.members.filter(
      (member) => !member.equals(groupUser?._id)
    );

    if (groupUser) {
      const member: UserDocument | null = await User.findOne({
        _id: groupUser.userId,
      });

      if (member) {
        member.groups = member.groups.filter((grpId) => !grpId.equals(groupId));
        await member.save();

        const socketId = emailToSocketMap[member.email];

        const data = {
          message: `You have been removed from ${group.groupName}`,
          groupId,
        };

        io.to(socketId).emit("removedMember", data);
      }
    }

    await group.save();

    return res.sendStatus(200);
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addGroupTransaction = async (req: Request, res: Response) => {
  const {
    groupId,
    paidBy,
    splitAmong,
    category,
    transactionTitle,
    transactionAmount,
    transactionDate,
  } = req.body;

  const email = decodeEmail(req.body.token);

  if (!email) {
    return res.status(401).json({ message: "Invalid Token" });
  }
  try {
    const user: UserDocument | null = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "User Not Found" });
    }

    const group: GroupDocument | null = await Group.findOne({
      _id: groupId,
    });

    if (!group) {
      return res.status(404).json({ message: "Group doesn't exist" });
    }

    const groupUsers: GroupUserDocument[] | null = await GroupUser.find({
      _id: { $in: group.members },
    });

    if (!groupUsers) {
      return res.status(401).json({ message: "Group Users not found" });
    }

    const GroupTransactionDoc = await GroupTransaction.create({
      groupId,
      paidBy: new Types.ObjectId(paidBy),
      splitAmong: splitAmong.map((id: string) => new Types.ObjectId(id)),
      category,
      transactionTitle,
      transactionAmount,
      transactionDate,
    });

    const balances: BalanceDocument[] | null = await Balance.find({
      groupId: new Types.ObjectId(groupId),
    });

    const balanceDebtors = splitAmong.filter((id: string) => id !== paidBy);

    for (const debtorId of balanceDebtors) {
      // Check if Existing Balance exist or not
      let existingBalance = balances.find((balance) => {
        return (
          balance.debtorId.equals(new Types.ObjectId(debtorId)) &&
          balance.creditorId.equals(new Types.ObjectId(paidBy))
        );
      });
      // Update if it exists
      if (existingBalance) {
        existingBalance.amount += transactionAmount / splitAmong.length;
        await existingBalance.save();
        continue;
      }
      // Check for Reverse Balance
      const reverseBalance = balances.find((balance) => {
        return (
          balance.debtorId.equals(new Types.ObjectId(paidBy)) &&
          balance.creditorId.equals(new Types.ObjectId(debtorId))
        );
      });

      let amountToAdd = transactionAmount / splitAmong.length;
      // Update if it exists
      if (reverseBalance) {
        if (reverseBalance.amount > amountToAdd) {
          // Update if Reverse Balance has more or equal amount
          reverseBalance.amount -= amountToAdd;
          await reverseBalance.save();
          continue;
        } else {
          // Update the amount of New Balance
          amountToAdd -= reverseBalance.amount;
          // Delete Reverse Balance has less amount
          await Balance.deleteOne({ _id: reverseBalance._id });
          // If amountToAdd = 0, no need to create a new balance
          if (amountToAdd === 0) {
            continue;
          }
          // Else create a new one
        }
      }

      const balanceDoc = await Balance.create({
        groupId: new Types.ObjectId(groupId),
        debtorId: new Types.ObjectId(debtorId),
        creditorId: new Types.ObjectId(paidBy),
        amount: amountToAdd,
      });

      group.balances.push(new Types.ObjectId(balanceDoc._id));
    }

    group.totalExpense += transactionAmount;
    group.groupTransactions.push(new Types.ObjectId(GroupTransactionDoc._id));

    await group.save();

    res.status(200).json({ message: "Transaction Added Successfully" });
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
