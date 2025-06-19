// import { Request, Response } from "express";
// import { ErrorResponse, SuccessResponse } from "../helper/apiResponse.helper";
// import User from "../models/user.models";
// import Event from "../models/event.models";
// import Chat from "../models/chat.models";
// import Order from "../models/order.models";
// import { chatRoom, userMap } from "../index";
// import Message from "../models/message.models";
// import client from "../config/redis";

// // fetchUserChats
// export const fetchUserChats = async (userId: any, socket: any, io: any) => {
//   try {
//     // validation
//     if (!userId) {
//       throw new Error("user is required");
//     }

//     // validation
//     const user = await User.findById(userId);
//     if (!user) {
//       throw new Error("User not found");
//     }

//     // fetch chats
//     const chats = await Chat.find({ participants: userId })
//       .populate({
//         path: "participants",
//         select: "_id username image",
//       })
//       .populate({
//         path: "message",
//         select: "_id sender",
//       })
//       .lean()
//       .exec();

//     // send message to client
//     socket.emit("fetchUserAllChats", {
//       success: true,
//       message: "All chats fetched",
//       data: chats,
//     });

//     return;
//   } catch (error) {
//     console.log(error);
//     return;
//   }
// };

// // unseenMessages
// export const unseenMessages = async (parsedData: any, socket: any) => {
//   try {
//     // validation
//     if (!parsedData?.payload) {
//       throw new Error("Invalid payload structure");
//     }
//     console.log("parsedData", parsedData);

//     // fetch data
//     const { userId } = parsedData.payload;

//     // validation
//     if (!userId) {
//       throw new Error("userId is required");
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       throw new Error("User not found");
//     }

//     // find allmessage of user and update isSeen to true of receiver
//     // TODO: decrease payload
//     const messages = await Message.find({ receiver: userId, isSeen: false });

//     // send message length to client
//     if (socket.readyState === WebSocket.OPEN) {
//       socket.send(
//         JSON.stringify({
//           type: "numOfUnseenMessages",
//           payload: {
//             totalMessages: messages?.length,
//           },
//         })
//       );
//     }

//     return;
//   } catch (error) {
//     console.log(error);
//     return;
//   }
// };

// // markAsRead
// export const markAsRead = async (parsedData: any, socket: any) => {
//   try {
//     if (!parsedData?.payload) {
//       throw new Error("Invalid payload structure");
//     }

//     const { chatId, userId, receiverId } = parsedData.payload;
//     if (!chatId || !userId) {
//       throw new Error("Invalid payload structure");
//     }

//     const participants = chatRoom.get(chatId);
//     const readerSocket = participants?.get(userId); // reader (current user)
//     const senderSocket = participants?.get(receiverId); // sender of the messages

//     // Find unread messages sent by 'receiverId' to 'userId'
//     const messages = await Message.find({
//       chatId,
//       receiver: userId,
//       sender: receiverId,
//       isSeen: false,
//     });

//     if (messages.length > 0) {
//       await Message.updateMany(
//         { chatId, receiver: userId, sender: receiverId, isSeen: false },
//         { $set: { isSeen: true } }
//       );
//     }

//     // Notify sender that their message was read
//     if (senderSocket && senderSocket.readyState === WebSocket.OPEN) {
//       senderSocket.send(
//         JSON.stringify({
//           type: "markAsReadYourMessage",
//           payload: { success: true, isSeen: true, byUserId: userId },
//         })
//       );
//     }

//     // Optionally notify the reader as well
//     if (readerSocket && readerSocket.readyState === WebSocket.OPEN) {
//       readerSocket.send(
//         JSON.stringify({
//           type: "markAsReadConfirmation",
//           payload: { success: true },
//         })
//       );
//     }

//     return;
//   } catch (error) {
//     console.log(error);
//     return;
//   }
// };

// // unseenMessageOfParticularChatIdOfUser
// export const unseenMessageOfParticularChatIdOfUser = async (
//   parsedData: any,
//   socket: any
// ) => {
//   try {
//     // validation
//     if (!parsedData?.payload) {
//       throw new Error("Invalid payload structure");
//     }

//     // fetch data
//     const { userId, chatIds } = parsedData.payload;

//     // validation
//     if (!userId || !chatIds || chatIds.length === 0) {
//       throw new Error("Invalid payload structure");
//     }

//     // find allmessage of chat and update isSeen to true of receiver
//     const counts = await Promise.all(
//       chatIds.map(async (chatId: any) => {
//         const count = await Message.countDocuments({
//           chatId: chatId,
//           receiver: userId,
//           isSeen: false,
//         });
//         return { chatId, unSeenCount: count };
//       })
//     );

//     if (counts.length > 0) {
//       socket?.send(
//         JSON.stringify({
//           type: "numOfUnseenMessages",
//           payload: counts,
//         })
//       );
//     }

//     return;
//   } catch (error) {
//     console.log(error);
//     return;
//   }
// };

// // request order
// export const requestOrder = async (formData: any, socket: any, io: any) => {
//   try {
//     // validation
//     if (
//       !formData?.location ||
//       !formData?.date ||
//       !formData?.time ||
//       !formData?.additionalInfo ||
//       !formData?.cabFare ||
//       !formData?.totalPrice ||
//       !formData?.eventId ||
//       !formData?.sender ||
//       !formData?.receiver ||
//       !formData?.subId ||
//       !formData?.unit
//     ) {
//       throw new Error("Invalid payload structure");
//     }

//     // fetch data
//     const {
//       location,
//       date,
//       time,
//       additionalInfo,
//       cabFare,
//       totalPrice,
//       eventId,
//       sender,
//       receiver,
//       subId,
//       unit,
//     } = formData;

//     console.log("first", formData);

//     // validation on event, user
//     const [fromUser, toUser, isEvent] = await Promise.all([
//       User.findById(sender).lean(),
//       User.findById(receiver).lean(),
//       Event.findById(eventId).lean(),
//     ]);
//     if (!fromUser || !toUser || !isEvent) {
//       throw new Error("Bad request");
//     }

//     // amount vaildation

//     // checkIsChatExists -> if not create chat
//     let chat = await Chat.findOne({
//       participants: { $all: [sender, receiver] },
//     });
//     if (!chat) {
//       chat = await Chat.create({
//         participants: [sender, receiver],
//       });
//     }

//     // create order
//     const order = await Order.create({
//       location,
//       date,
//       time,
//       additionalInfo,
//       cabFare,
//       totalPrice,
//       event: eventId,
//       sender,
//       receiver,
//       subId: subId?._id,
//       unit,
//       chat: chat?._id,
//     });

//     // createMessage
//     const message = new Message({
//       sender,
//       receiver,
//       chatId: chat?._id,
//       text: formData,
//       type: "order",
//       order: order._id,
//     });
//     await message.save();

//     // update chat with the new message
//     await Chat.findByIdAndUpdate(
//       chat?._id,
//       { $push: { message: message._id } },
//       { new: true }
//     );

//     // update chatRoom
//     if (!chatRoom?.has(chat?._id?.toString())) {
//       chatRoom?.set(chat?._id?.toString(), new Map());
//     }
//     let participants = chatRoom.get(chat?._id?.toString());

//     // check if sender is not in chatRoom then add to it
//     if (participants) {
//       const senderId = message?.sender?.toString();
//       const senderSocket = participants.get(senderId);

//       if (!senderSocket || senderSocket.readyState !== WebSocket.OPEN) {
//         participants.set(senderId, socket);
//       }
//     }

//     const receiverWs = participants?.get(message?.receiver?.toString());

//     // isSender or isReceiver is online
//     const senderSocket = await client.get(
//       `user:${message?.sender?.toString()}`
//     );
//     const receiverSocket = await client.get(
//       `user:${message?.receiver?.toString()}`
//     );

//     // sent to sender
//     if (senderSocket) {
//       io.to(senderSocket).emit("newOrder", {
//         chatId: chat?._id,
//         success: true,
//         userId: message?.receiver?.toString(),
//       });
//     }

//     // sent to receiver
//     if (receiverSocket) {
//       io.to(receiverSocket).emit("newOrder", {
//         chatId: chat?._id,
//         success: true,
//         userId: message?.sender?.toString(),
//       });
//     }

//     // send message to receiver -> if chat is open
//     if (receiverWs && receiverWs?.readyState === WebSocket.OPEN) {
//       receiverWs.send(
//         JSON.stringify({ type: "receiveMessage", payload: message })
//       );
//     } else {
//       console.log(`Receiver socket for ${receiver} is not open`);
//     }

//     // reload chat
//     if (receiverWs && receiverWs?.readyState === WebSocket.OPEN) {
//       receiverWs?.send(
//         JSON.stringify({
//           type: "reloadChat",
//           payload: {
//             success: true,
//             message: "Chat reloaded successfully",
//             chatId: chat?._id,
//           },
//         })
//       );
//     }

//     // send response to client

//     return;
//   } catch (error) {
//     console.log("error", error);
//     // send response to client
//     socket?.emit("orderStatus", {
//       success: false,
//       message: "Order request failed",
//     });
//     throw new Error("Order request failed");
//   }
// };

// // sendMessage
// export const sendMessage = async (
//   messagePayload: any,
//   io: any
// ): Promise<any> => {
//   try {
//     // Validate payload
//     if (
//       !messagePayload ||
//       !messagePayload.sender ||
//       !messagePayload.receiver ||
//       !messagePayload.chatId ||
//       !messagePayload.text
//     ) {
//       console.log("Invalid data received:", messagePayload);
//       return;
//     }

//     const { sender, receiver, chatId, text } = messagePayload;

//     // Get chat participants
//     const senderSocket = await client.hget(`chat:${chatId}`, sender);
//     const receiverSocket = await client.hget(`chat:${chatId}`, receiver);

//     console.log("senderSocket", senderSocket);
//     console.log("receiverSocket", receiverSocket);

//     const isReceiverOnline = await client.get(`user:${receiver}`);
//     const receiverActiveChatId = await client.get(`activeChat:${receiver}`);
//     console.log("isReceiverOnline", isReceiverOnline);
//     console.log("receiverActiveChatId", receiverActiveChatId);

//     // Create and save message
//     const message = new Message({
//       sender,
//       receiver,
//       chatId,
//       text,
//       isSeen: isReceiverOnline && receiverActiveChatId === chatId,
//     });
//     await message.save();

//     console.log("message", message);  

//     if (receiverActiveChatId === chatId) {
//       // means they are in same chat

//       // send live message to receiver and sender
//       if (receiverSocket) {
//         io.to(receiverSocket).emit("receiveMessage", message);
//       } else {
//         console.log(`Receiver socket for ${receiver} is not open`);
//       }
//     }

//     if(senderSocket) {
//       io.to(senderSocket).emit("receiveMessage", message);
//     } else {
//       console.log(`Sender socket for ${sender} is not open`);
//     }

//     // Update chat with the new message
//     const updatedChat = await Chat.findByIdAndUpdate(
//       chatId,
//       { $push: { message: message._id } },
//       { new: true }
//     );

//     if (!updatedChat) {
//       console.log("Failed to update chat:", chatId);
//     } else {
//       console.log("Chat updated successfully:", updatedChat);
//     }
//   } catch (error) {
//     console.error("Error in sendMessage:", error);
//   }
// };

// // fetchAllMessages
// export const fetchAllMessages = async (
//   req: Request,
//   res: Response
// ): Promise<any> => {
//   try {
//     // fetch data
//     const { chatId } = req.body;

//     // validation
//     if (!chatId) {
//       return ErrorResponse(res, 400, "All fields are required");
//     }

//     // fetch chat
//     const chat = await Chat.findById(chatId);

//     // validation
//     if (!chat) {
//       return ErrorResponse(res, 404, "Chat not found");
//     }

//     // fetch messages
//     const data = await Message.find({ chatId: chatId })
//       .populate("order")
//       .lean();

//     // return res
//     return SuccessResponse(res, 200, "Messages fetched successfully", data);
//   } catch (error) {
//     console.log(error);
//     return ErrorResponse(res, 500, "Internal server error");
//   }
// };

// // fetchOrderHistory -> TODO
// export const fetchOrderHistory = async (
//   req: Request,
//   res: Response
// ): Promise<any> => {
//   try {
//     // fetch data
//     const { userId } = req.body;

//     // validation
//     if (!userId) {
//       return ErrorResponse(res, 400, "All fields are required");
//     }

//     // fetch user
//     const user = await User.findById(userId);

//     // validation
//     if (!user) {
//       return ErrorResponse(res, 404, "User not found");
//     }

//     // fetch orders
//     const data = await Order.find({ sender: userId });

//     // return res
//     return SuccessResponse(res, 200, "Orders fetched successfully", data);
//   } catch (error) {
//     console.log(error);
//     return ErrorResponse(res, 500, "Internal server error");
//   }
// };

// // fetchOtherUser
// export const fetchOtherUser = async (
//   req: Request,
//   res: Response
// ): Promise<any> => {
//   try {
//     // fetch data
//     const { userId } = req.body;

//     // validation
//     if (!userId) {
//       return ErrorResponse(res, 400, "All fields are required");
//     }

//     // fetch user
//     const data = await User.findById(userId).select("_id username image");

//     // return res
//     return SuccessResponse(res, 200, "User fetched successfully", data);
//   } catch (error) {
//     console.log(error);
//     return ErrorResponse(res, 500, "Internal server error");
//   }
// };

// // acceptOrder
// export const acceptOrder = async (parsedData: any, socket: any) => {
//   try {
//     // validation
//     if (!parsedData?.payload?.msgId) {
//       throw new Error("Invalid payload structure");
//     }
//     // fetch data
//     const { msgId, mark } = parsedData.payload;

//     // validation
//     if (!msgId) {
//       throw new Error("Invalid payload structure");
//     }

//     // fetch message
//     const message = await Message.findById(msgId);

//     // validation
//     if (!message) {
//       throw new Error("Message not found");
//     }

//     // fetch order
//     const order = await Order.findById(message?.order);

//     // validation
//     if (!order) {
//       throw new Error("Order not found");
//     }

//     // update order
//     await Order.findByIdAndUpdate(
//       order?._id,
//       {
//         $set: {
//           status: mark,
//         },
//       },
//       { new: true }
//     );

//     // update message
//     await Message.findByIdAndUpdate(
//       message?._id,
//       {
//         $set: {
//           isSeen: true,
//         },
//       },
//       { new: true }
//     );

//     if (!chatRoom.get(message?.chatId?.toString())) {
//       chatRoom.set(message?.chatId?.toString(), new Map());
//     }

//     const participants = chatRoom.get(message?.chatId?.toString());

//     // participants?.set(message?.sender?.toString(), socket);
//     // participants?.set(message?.receiver?.toString(), socket);

//     if (!participants) {
//       return;
//     }

//     const senderWs = participants?.get(message?.sender?.toString());
//     const receiverWs = participants?.get(message?.receiver?.toString());

//     // send response to client
//     senderWs?.send(
//       JSON.stringify({
//         type: "orderAccepted",
//         payload: {
//           success: true,
//           message: "Your Order accepted, please do payment",
//         },
//       })
//     );

//     // send response to receiver
//     receiverWs?.send(
//       JSON.stringify({
//         type: "orderAccepted",
//         payload: {
//           success: true,
//           message: "Order accepted successfully",
//         },
//       })
//     );
//   } catch (error) {
//     console.log(error);
//     // send response to client
//     // senderWs?.send(
//     //   JSON.stringify({
//     //     type: "orderStatus",
//     //     payload: {
//     //       success: false,
//     //       message: "Order request failed",
//     //     }
//     //   })
//     // )
//     return;
//   }
// };

// // fetch order of particular chat
// export const fetchOrdersOfChat = async (
//   req: Request,
//   res: Response
// ): Promise<any> => {
//   try {
//     // fetch data
//     const { chatId } = req.body;

//     // validation
//     if (!chatId) {
//       return ErrorResponse(res, 400, "All fields are required");
//     }

//     // fetch chat
//     const chat = await Chat.findById(chatId);

//     // validation
//     if (!chat) {
//       return ErrorResponse(res, 404, "Chat not found");
//     }

//     // fetch orders
//     const data = await Order.find({ chat: chatId });

//     // return res
//     return SuccessResponse(res, 200, "Orders fetched successfully", data);
//   } catch (error) {
//     console.log(error);
//     return ErrorResponse(res, 500, "Internal server error");
//   }
// };

// export const reloadChatPage = async (parsedData: any, socket: any) => {
//   try {
//     // validation
//     if (!parsedData?.payload) {
//       throw new Error("Invalid payload structure");
//     }

//     // fetch data
//     const { receiverId, chatId } = parsedData.payload;
//     console.log("receiverId::::", receiverId);
//     // validation
//     if (!receiverId) {
//       throw new Error("Invalid receiverId");
//     }

//     // fetch chat
//     const chat = await Chat.findById(chatId);

//     if (!chat) {
//       throw new Error("Chat not found");
//     }

//     // fetch participants
//     const participants = chatRoom.get(chatId);

//     // if participants exist delete user from participants
//     if (!participants) {
//       return;
//     }

//     const receiverWs = participants.get(receiverId);
//     console.log("receiverWs::::", receiverWs);
//     if (!receiverWs) {
//       return;
//     }

//     // if chatRoom is empty delete chatRoom
//     if (chatRoom.size === 0) {
//       chatRoom.delete(chatId);
//     }

//     console.log("receiverWs::::", receiverWs.readyState);

//     // send message to client
//     receiverWs?.send(
//       JSON.stringify({
//         type: "reloadChat",
//         payload: {
//           success: true,
//           message: "Chat reloaded successfully",
//           chatId: chatId,
//         },
//       })
//     );

//     return;
//   } catch (error) {
//     console.log(error);
//     return;
//   }
// };
