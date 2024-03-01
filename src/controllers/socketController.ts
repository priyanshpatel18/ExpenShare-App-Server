// controllers/socketController.js
import { Types } from "mongoose";
import { Socket } from "socket.io";
import { emailToSocketMap, io } from "..";
import {
  Group,
  GroupDocument,
  GroupRequest,
  GroupTransaction,
  GroupTransactionDocument,
  GroupUser,
  User,
  UserDocument,
} from "../models/models";
import { decodeEmail } from "./controllers";

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

    const groupUsers = await GroupUser.find({
      userName: { $in: data.selectedUsers },
    });

    if (!groupUsers) {
      socket.emit("notFound", "User not found");
    }

    groupUsers.forEach(async (member) => {
      const RequestDocument = await GroupRequest.create({
        sender: groupSender._id,
        receiver: member._id,
        groupId: data.groupId,
        groupName: data.groupName,
      });

      const object = {
        message: "You got an invitation from " + groupSender.userName,
        requestId: RequestDocument._id,
        groupName: data.groupName,
        groupId: data.groupId,
      };

      const userSocketId = emailToSocketMap[member.email];

      if (userSocketId) {
        io.to(userSocketId).emit("requestReceived", object);
      }
    });
  } catch (error) {
    console.error("Error sending request:", error);
  }
}
export async function updateGroup(socket: Socket, data: { groupId: string }) {
  try {
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

    const createdByUser = groupUsers.find((user) =>
      new Types.ObjectId(user._id).equals(group.createdBy)
    );

    // Map members to include user details
    const members = groupUsers.map((user) => ({
      _id: user._id,
      userName: user.userName,
      email: user.email,
      profilePicture: user.profilePicture,
    }));

    const updatedGroup = {
      _id: group._id,
      groupName: group.groupName,
      groupProfile: group.groupProfile ? group.groupProfile : "",
      createdBy: {
        _id: createdByUser?._id,
        userName: createdByUser?.userName,
        email: createdByUser?.email,
        profilePicture: createdByUser?.profilePicture,
      },
      members: members,
      totalExpense: group.totalExpense,
      category: group.category,
    };

    updatedGroup.members.forEach(async (member) => {
      const userSocketId = emailToSocketMap[member.email];

      if (userSocketId) {
        socket.to(userSocketId).emit("updateGroup", { group: updatedGroup });
        console.log("Updated: ", member.email, userSocketId);
      }
    });
  } catch (error) {
    console.error("Error updating group:", error);
  }
}
