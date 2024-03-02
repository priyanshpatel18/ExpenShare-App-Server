// controllers/socketController.js
import jwt, { JwtPayload } from "jsonwebtoken";
import { Types } from "mongoose";
import { Socket } from "socket.io";
import { emailToSocketMap, io } from "..";
import { Group, GroupDocument } from "../models/Group";
import { GroupUser } from "../models/GroupUser";
import { GroupRequest } from "../models/Request";
import { User, UserDocument } from "../models/User";
import {
  GroupTransaction,
  GroupTransactionDocument,
} from "../models/GroupTransaction";
import { Balance, BalanceDocument } from "../models/Balance";

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

export async function handleGetUsers(socket: Socket, filter: string) {
  try {
    const users = await User.find({
      $or: [
        { userName: { $regex: filter, $options: "i" } },
        { email: { $regex: filter, $options: "i" } },
      ],
    });
    socket.emit("filteredUsers", users);
  } catch (error) {
    console.error("Error filtering users:", error);
  }
}

interface requestData {
  token: string;
  selectedUsers: [
    {
      userName: string;
      profilePicture: string;
    }
  ];
  groupId: string;
  groupName: string;
}

export async function handleSendRequest(socket: Socket, data: requestData) {
  try {
    const token = data.token;
    // Decode Email
    const email = decodeEmail(token);
    // Check if user exists
    if (!email) {
      socket.emit("notFound", "User not found");
      return;
    }

    const group: GroupDocument | null = await Group.findOne({
      _id: data.groupId,
    });

    if (!group) {
      socket.emit("notFound", "Group not found");
      return;
    }

    const user: UserDocument | null = await User.findOne({ email });

    if (!user) {
      socket.emit("notFound", "User not found");
      return;
    }

    // Get Sender
    const groupSender = await GroupUser.findOne({ email: user.email });

    if (!groupSender) {
      socket.emit("notFound", "User not found");
      return;
    }

    const users: UserDocument[] | null = await User.find({
      userName: { $in: data.selectedUsers },
    });

    if (!users) {
      socket.emit("notFound", "User not found");
    }

    users.forEach(async (user) => {
      const RequestDocument = await GroupRequest.create({
        sender: groupSender._id,
        receiver: user._id,
        groupId: data.groupId,
        groupName: data.groupName,
      });

      const object = {
        message: "You got an invitation from " + groupSender.userName,
        requestId: RequestDocument._id,
        groupName: data.groupName,
        groupId: data.groupId,
      };

      const userSocketId = emailToSocketMap[user.email];

      if (userSocketId) {
        io.to(userSocketId).emit("requestReceived", object);
      }
    });
  } catch (error) {
    console.error("Error sending request:", error);
  }
}

export const updateGroup = async (
  socket: Socket,
  data: {
    groupId: string;
  }
) => {
  const { groupId } = data;

  const group: GroupDocument | null = await Group.findOne({ _id: groupId });
  if (!group) {
    console.log("No Group");
    socket.emit("groupNotFound", "Group doesn't exist");
    return;
  }

  const groupUsers = await GroupUser.find({
    _id: { $in: group.members },
  });

  const members = groupUsers.map((user) => ({
    _id: user._id,
    userName: user.userName,
    email: user.email,
    profilePicture: user.profilePicture,
  }));

  const groupTransactions: GroupTransactionDocument[] | null =
    await GroupTransaction.find({
      groupId,
    });

  const transactions = groupTransactions.map((transaction) => ({
    _id: transaction._id,
    groupId: new Types.ObjectId(transaction.groupId),
    paidBy: groupUsers.find((user) =>
      new Types.ObjectId(user._id).equals(transaction.paidBy)
    ),
    splitAmong: groupUsers.filter((user) =>
      transaction.splitAmong.includes(new Types.ObjectId(user._id))
    ),
    category: transaction.category,
    transactionAmount: transaction.transactionAmount,
    transactionTitle: transaction.transactionTitle,
    transactionDate: transaction.transactionDate,
    totalExpense: group.totalExpense,
  }));

  const groupBalances: BalanceDocument[] | null = await Balance.find({
    groupId,
  });

  // const balances = groupBalances.map((balance) => ({
  //   _id: balance._id,
  //   groupId: new Types.ObjectId(balance.groupId),
  //   debtorIds: groupUsers.filter((user) =>
  //     balance.debtorIds.some((debtorId) =>
  //       new Types.ObjectId(user._id).equals(debtorId)
  //     )
  //   ),
  //   creditorId: groupUsers.find((user) =>
  //     new Types.ObjectId(user._id).equals(balance.creditorId)
  //   ),
  //   amount: balance.amount,
  //   status: balance.settled,
  //   date: balance.date,
  // }));

  const updatedGroup = {
    _id: group._id,
    groupName: group.groupName,
    groupProfile: group.groupProfile ? group.groupProfile : undefined,
    createdBy: groupUsers.find((user) =>
      new Types.ObjectId(user._id).equals(group.createdBy)
    ),
    members: members,
    groupExpenses: transactions,
    // balances: balances,
    totalExpense: group.totalExpense,
    category: group.category,
  };

  for (const member of groupUsers) {
    const userSocketId = emailToSocketMap[member.email];
    if (userSocketId) {
      io.to(userSocketId).emit("updateGroup", { group: updatedGroup });
    }
  }
};
