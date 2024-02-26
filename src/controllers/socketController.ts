// controllers/socketController.js
import { Socket } from "socket.io";
import { GroupRequest, User } from "../models/models";
import { decodeEmail } from "./controllers";
import { emailToSocketMap, io } from "..";

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

    if (users && sender) {
      const senderId = emailToSocketMap[sender.email];
      io.to(senderId).emit("requestReceived", "Request Sent");

      users.forEach(async (user) => {
        const userSocketId = emailToSocketMap[user.email];

        console.log(user);

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
        };

        io.to(userSocketId).emit("requestReceived", object);

        console.log(object);
      });
    }
  } catch (error) {
    console.error("Error sending request:", error);
  }
}
