// controllers/socketController.js
import { Socket } from "socket.io";
import { emailToSocketMap, io } from "..";
import {
  Group,
  GroupDocument,
  GroupRequest,
  GroupUser,
  User,
} from "../models/models";
import { decodeEmail } from "./controllers";
import { Types } from "mongoose";

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
    // Get Sender
    const sender = await User.findOne({ email });

    const users = await User.find({ userName: { $in: data.selectedUsers } });

    if (users && sender) {
      const senderId = emailToSocketMap[sender.email];
      io.to(senderId).emit("requestSent", "Request Sent");

      for (const user of users) {
        const userSocketId = emailToSocketMap[user.email];

        const existingRequest = await GroupRequest.findOne({
          sender: sender._id,
          receiver: user._id,
          groupId: data.groupId,
          status: "PENDING",
        });

        if (!existingRequest) {
          const RequestDocument = await GroupRequest.create({
            sender: sender._id,
            receiver: user._id,
            groupId: data.groupId,
            groupName: data.groupName,
          });

          const object = {
            message: "You got an invitation from " + sender.userName,
            requestId: RequestDocument._id,
            groupName: data.groupName,
            groupId: data.groupId,
          };

          io.to(userSocketId).emit("requestReceived", object);
        }
      }
    }
  } catch (error) {
    console.error("Error sending request:", error);
  }
}
export async function handleAcceptRequest(
  socket: Socket,
  data: { groupId: string }
) {
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

    const userEmails = groupUsers.map((user) => user.email);

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
      groupExpenses: [],
      totalExpense: 0,
      category: group.category,
    };

    userEmails.forEach(async (email) => {
      const userSocketId = emailToSocketMap[email];

      io.to(userSocketId).emit("updateGroup", { group: updatedGroup });
    });
  } catch {}
}
