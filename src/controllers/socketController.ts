// controllers/socketController.js
import { Socket } from "socket.io";
import { emailToSocketMap, io } from "..";
import { Group, GroupDocument, GroupRequest, User } from "../models/models";
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
    }
    // Get Sender
    const sender = await User.findOne({ email });

    const users = await User.find({ userName: { $in: data.selectedUsers } });

    const existingRequests = await GroupRequest.find({
      sender: sender?._id,
      receiver: { $in: users.map((user) => user._id) },
      groupId: data.groupId,
    });

    if (users && sender) {
      const senderId = emailToSocketMap[sender.email];
      io.to(senderId).emit("requestSent", "Request Sent");

      users.forEach(async (user) => {
        const userSocketId = emailToSocketMap[user.email];

        const requestExists = existingRequests.some(
          (request) =>
            request.receiver &&
            request.receiver.equals(user._id) &&
            (request.status === "PENDING" || request.status === "ACCEPTED")
        );

        if (!requestExists) {
          const RequestDocument = await GroupRequest.create({
            sender: sender?._id,
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
      });
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

    const users = await User.find({ _id: { $in: group.members } });

    const userEmails = users.map((user) => user.email);

    userEmails.forEach(async (email) => {
      const userSocketId = emailToSocketMap[email];
      console.log(userSocketId);

      io.to(userSocketId).emit("updateGroup", { group });
    });
  } catch {}
}
