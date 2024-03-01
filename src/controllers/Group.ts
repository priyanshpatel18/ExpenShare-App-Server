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
      return res.status(401).json({ message: "Group User Not Found" });
    }

    const groups: GroupDocument[] | null = await Group.find({
      members: { $in: groupUser._id },
    });

    const allGroupUsers: GroupUserDocument[] | null = await GroupUser.find();
    const allGroupTransactions: GroupTransactionDocument[] | null =
      await GroupTransaction.find();

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
      groupExpenses: allGroupTransactions.filter((transaction) => {
        const groupId = new Types.ObjectId(group._id);
        return transaction.groupId.equals(groupId);
      }),
      totalExpense: group.totalExpense,
      category: group.category,
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

    const groupUsers: GroupUserDocument[] | null = await GroupUser.find({
      email: { $in: [...splitAmong, paidBy] },
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

    const group: GroupDocument | null = await Group.findOne({
      _id: groupId,
    });

    if (!group) {
      return res.status(404).json({ message: "Group doesn't exist" });
    }

    group.totalExpense += transactionAmount;
    group.groupTransactions.push(new Types.ObjectId(GroupTransactionDoc._id));

    await group.save();

    const members = await GroupUser.find({
      _id: { $in: splitAmong },
    });

    const totalMembers = splitAmong.length + 1;
    const splitAmount = transactionAmount / totalMembers;
    const paidAmount = transactionAmount - splitAmount;

    for (const member of members) {
      const balance: BalanceDocument = await Balance.findOneAndUpdate(
        { groupId: groupId, memberId: member._id },
        {
          $inc: {
            getsBack: member._id === paidBy ? paidAmount : 0,
            owes: splitAmong.includes(member._id) ? splitAmount : 0,
          },
        },
        { upsert: true, new: true }
      );

      member.balances.push(balance._id);
      io.to(member.email).emit("newTransaction", "A new Transaction was added");
    }

    res.status(200).json({ message: "Transaction Added Successfully" });
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
