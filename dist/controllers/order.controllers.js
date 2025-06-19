"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reloadChatPage = exports.fetchOrdersOfChat = exports.acceptOrder = exports.fetchOtherUser = exports.fetchOrderHistory = exports.fetchAllMessages = exports.sendMessage = exports.requestOrder = exports.unseenMessageOfParticularChatIdOfUser = exports.markAsRead = exports.unseenMessages = exports.fetchUserChats = void 0;
const apiResponse_helper_1 = require("../helper/apiResponse.helper");
const user_models_1 = __importDefault(require("../models/user.models"));
const event_models_1 = __importDefault(require("../models/event.models"));
const chat_models_1 = __importDefault(require("../models/chat.models"));
const order_models_1 = __importDefault(require("../models/order.models"));
const index_1 = require("../index");
const message_models_1 = __importDefault(require("../models/message.models"));
const redis_1 = __importDefault(require("../config/redis"));
// fetchUserChats
const fetchUserChats = (userId, socket, io) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // validation
        if (!userId) {
            throw new Error("user is required");
        }
        // validation
        const user = yield user_models_1.default.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        // fetch chats
        const chats = yield chat_models_1.default.find({ participants: userId })
            .populate({
            path: "participants",
            select: "_id username image",
        })
            .populate({
            path: "message",
            select: "_id sender",
        })
            .lean()
            .exec();
        // send message to client
        socket.emit("fetchUserAllChats", {
            success: true,
            message: "All chats fetched",
            data: chats,
        });
        return;
    }
    catch (error) {
        console.log(error);
        return;
    }
});
exports.fetchUserChats = fetchUserChats;
// unseenMessages
const unseenMessages = (parsedData, socket) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // validation
        if (!(parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload)) {
            throw new Error("Invalid payload structure");
        }
        console.log("parsedData", parsedData);
        // fetch data
        const { userId } = parsedData.payload;
        // validation
        if (!userId) {
            throw new Error("userId is required");
        }
        const user = yield user_models_1.default.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        // find allmessage of user and update isSeen to true of receiver
        // TODO: decrease payload
        const messages = yield message_models_1.default.find({ receiver: userId, isSeen: false });
        // send message length to client
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: "numOfUnseenMessages",
                payload: {
                    totalMessages: messages === null || messages === void 0 ? void 0 : messages.length,
                },
            }));
        }
        return;
    }
    catch (error) {
        console.log(error);
        return;
    }
});
exports.unseenMessages = unseenMessages;
// markAsRead
const markAsRead = (parsedData, socket) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!(parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload)) {
            throw new Error("Invalid payload structure");
        }
        const { chatId, userId, receiverId } = parsedData.payload;
        if (!chatId || !userId) {
            throw new Error("Invalid payload structure");
        }
        const participants = index_1.chatRoom.get(chatId);
        const readerSocket = participants === null || participants === void 0 ? void 0 : participants.get(userId); // reader (current user)
        const senderSocket = participants === null || participants === void 0 ? void 0 : participants.get(receiverId); // sender of the messages
        // Find unread messages sent by 'receiverId' to 'userId'
        const messages = yield message_models_1.default.find({
            chatId,
            receiver: userId,
            sender: receiverId,
            isSeen: false,
        });
        if (messages.length > 0) {
            yield message_models_1.default.updateMany({ chatId, receiver: userId, sender: receiverId, isSeen: false }, { $set: { isSeen: true } });
        }
        // Notify sender that their message was read
        if (senderSocket && senderSocket.readyState === WebSocket.OPEN) {
            senderSocket.send(JSON.stringify({
                type: "markAsReadYourMessage",
                payload: { success: true, isSeen: true, byUserId: userId },
            }));
        }
        // Optionally notify the reader as well
        if (readerSocket && readerSocket.readyState === WebSocket.OPEN) {
            readerSocket.send(JSON.stringify({
                type: "markAsReadConfirmation",
                payload: { success: true },
            }));
        }
        return;
    }
    catch (error) {
        console.log(error);
        return;
    }
});
exports.markAsRead = markAsRead;
// unseenMessageOfParticularChatIdOfUser
const unseenMessageOfParticularChatIdOfUser = (parsedData, socket) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // validation
        if (!(parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload)) {
            throw new Error("Invalid payload structure");
        }
        // fetch data
        const { userId, chatIds } = parsedData.payload;
        // validation
        if (!userId || !chatIds || chatIds.length === 0) {
            throw new Error("Invalid payload structure");
        }
        // find allmessage of chat and update isSeen to true of receiver
        const counts = yield Promise.all(chatIds.map((chatId) => __awaiter(void 0, void 0, void 0, function* () {
            const count = yield message_models_1.default.countDocuments({
                chatId: chatId,
                receiver: userId,
                isSeen: false,
            });
            return { chatId, unSeenCount: count };
        })));
        if (counts.length > 0) {
            socket === null || socket === void 0 ? void 0 : socket.send(JSON.stringify({
                type: "numOfUnseenMessages",
                payload: counts,
            }));
        }
        return;
    }
    catch (error) {
        console.log(error);
        return;
    }
});
exports.unseenMessageOfParticularChatIdOfUser = unseenMessageOfParticularChatIdOfUser;
// request order
const requestOrder = (formData, socket, io) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        // validation
        if (!(formData === null || formData === void 0 ? void 0 : formData.location) ||
            !(formData === null || formData === void 0 ? void 0 : formData.date) ||
            !(formData === null || formData === void 0 ? void 0 : formData.time) ||
            !(formData === null || formData === void 0 ? void 0 : formData.additionalInfo) ||
            !(formData === null || formData === void 0 ? void 0 : formData.cabFare) ||
            !(formData === null || formData === void 0 ? void 0 : formData.totalPrice) ||
            !(formData === null || formData === void 0 ? void 0 : formData.eventId) ||
            !(formData === null || formData === void 0 ? void 0 : formData.sender) ||
            !(formData === null || formData === void 0 ? void 0 : formData.receiver) ||
            !(formData === null || formData === void 0 ? void 0 : formData.subId) ||
            !(formData === null || formData === void 0 ? void 0 : formData.unit)) {
            throw new Error("Invalid payload structure");
        }
        // fetch data
        const { location, date, time, additionalInfo, cabFare, totalPrice, eventId, sender, receiver, subId, unit, } = formData;
        console.log("first", formData);
        // validation on event, user
        const [fromUser, toUser, isEvent] = yield Promise.all([
            user_models_1.default.findById(sender).lean(),
            user_models_1.default.findById(receiver).lean(),
            event_models_1.default.findById(eventId).lean(),
        ]);
        if (!fromUser || !toUser || !isEvent) {
            throw new Error("Bad request");
        }
        // amount vaildation
        // checkIsChatExists -> if not create chat
        let chat = yield chat_models_1.default.findOne({
            participants: { $all: [sender, receiver] },
        });
        if (!chat) {
            chat = yield chat_models_1.default.create({
                participants: [sender, receiver],
            });
        }
        // create order
        const order = yield order_models_1.default.create({
            location,
            date,
            time,
            additionalInfo,
            cabFare,
            totalPrice,
            event: eventId,
            sender,
            receiver,
            subId: subId === null || subId === void 0 ? void 0 : subId._id,
            unit,
            chat: chat === null || chat === void 0 ? void 0 : chat._id,
        });
        // createMessage
        const message = new message_models_1.default({
            sender,
            receiver,
            chatId: chat === null || chat === void 0 ? void 0 : chat._id,
            text: formData,
            type: "order",
            order: order._id,
        });
        yield message.save();
        // update chat with the new message
        yield chat_models_1.default.findByIdAndUpdate(chat === null || chat === void 0 ? void 0 : chat._id, { $push: { message: message._id } }, { new: true });
        // update chatRoom
        if (!(index_1.chatRoom === null || index_1.chatRoom === void 0 ? void 0 : index_1.chatRoom.has((_a = chat === null || chat === void 0 ? void 0 : chat._id) === null || _a === void 0 ? void 0 : _a.toString()))) {
            index_1.chatRoom === null || index_1.chatRoom === void 0 ? void 0 : index_1.chatRoom.set((_b = chat === null || chat === void 0 ? void 0 : chat._id) === null || _b === void 0 ? void 0 : _b.toString(), new Map());
        }
        let participants = index_1.chatRoom.get((_c = chat === null || chat === void 0 ? void 0 : chat._id) === null || _c === void 0 ? void 0 : _c.toString());
        // check if sender is not in chatRoom then add to it
        if (participants) {
            const senderId = (_d = message === null || message === void 0 ? void 0 : message.sender) === null || _d === void 0 ? void 0 : _d.toString();
            const senderSocket = participants.get(senderId);
            if (!senderSocket || senderSocket.readyState !== WebSocket.OPEN) {
                participants.set(senderId, socket);
            }
        }
        const receiverWs = participants === null || participants === void 0 ? void 0 : participants.get((_e = message === null || message === void 0 ? void 0 : message.receiver) === null || _e === void 0 ? void 0 : _e.toString());
        // isSender or isReceiver is online
        const senderSocket = yield redis_1.default.get(`user:${(_f = message === null || message === void 0 ? void 0 : message.sender) === null || _f === void 0 ? void 0 : _f.toString()}`);
        const receiverSocket = yield redis_1.default.get(`user:${(_g = message === null || message === void 0 ? void 0 : message.receiver) === null || _g === void 0 ? void 0 : _g.toString()}`);
        // sent to sender
        if (senderSocket) {
            io.to(senderSocket).emit("newOrder", {
                chatId: chat === null || chat === void 0 ? void 0 : chat._id,
                success: true,
                userId: (_h = message === null || message === void 0 ? void 0 : message.receiver) === null || _h === void 0 ? void 0 : _h.toString(),
            });
        }
        // sent to receiver
        if (receiverSocket) {
            io.to(receiverSocket).emit("newOrder", {
                chatId: chat === null || chat === void 0 ? void 0 : chat._id,
                success: true,
                userId: (_j = message === null || message === void 0 ? void 0 : message.sender) === null || _j === void 0 ? void 0 : _j.toString(),
            });
        }
        // send message to receiver -> if chat is open
        if (receiverWs && (receiverWs === null || receiverWs === void 0 ? void 0 : receiverWs.readyState) === WebSocket.OPEN) {
            receiverWs.send(JSON.stringify({ type: "receiveMessage", payload: message }));
        }
        else {
            console.log(`Receiver socket for ${receiver} is not open`);
        }
        // reload chat
        if (receiverWs && (receiverWs === null || receiverWs === void 0 ? void 0 : receiverWs.readyState) === WebSocket.OPEN) {
            receiverWs === null || receiverWs === void 0 ? void 0 : receiverWs.send(JSON.stringify({
                type: "reloadChat",
                payload: {
                    success: true,
                    message: "Chat reloaded successfully",
                    chatId: chat === null || chat === void 0 ? void 0 : chat._id,
                },
            }));
        }
        // send response to client
        return;
    }
    catch (error) {
        console.log("error", error);
        // send response to client
        socket === null || socket === void 0 ? void 0 : socket.emit("orderStatus", {
            success: false,
            message: "Order request failed",
        });
        throw new Error("Order request failed");
    }
});
exports.requestOrder = requestOrder;
// sendMessage
const sendMessage = (messagePayload, io) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validate payload
        if (!messagePayload ||
            !messagePayload.sender ||
            !messagePayload.receiver ||
            !messagePayload.chatId ||
            !messagePayload.text) {
            console.log("Invalid data received:", messagePayload);
            return;
        }
        const { sender, receiver, chatId, text } = messagePayload;
        // Get chat participants
        const senderSocket = yield redis_1.default.hget(`chat:${chatId}`, sender);
        const receiverSocket = yield redis_1.default.hget(`chat:${chatId}`, receiver);
        console.log("senderSocket", senderSocket);
        console.log("receiverSocket", receiverSocket);
        const isReceiverOnline = yield redis_1.default.get(`user:${receiver}`);
        const receiverActiveChatId = yield redis_1.default.get(`activeChat:${receiver}`);
        console.log("isReceiverOnline", isReceiverOnline);
        console.log("receiverActiveChatId", receiverActiveChatId);
        // Create and save message
        const message = new message_models_1.default({
            sender,
            receiver,
            chatId,
            text,
            isSeen: isReceiverOnline && receiverActiveChatId === chatId,
        });
        yield message.save();
        console.log("message", message);
        if (receiverActiveChatId === chatId) {
            // means they are in same chat
            // send live message to receiver and sender
            if (receiverSocket) {
                io.to(receiverSocket).emit("receiveMessage", message);
            }
            else {
                console.log(`Receiver socket for ${receiver} is not open`);
            }
        }
        if (senderSocket) {
            io.to(senderSocket).emit("receiveMessage", message);
        }
        else {
            console.log(`Sender socket for ${sender} is not open`);
        }
        // Update chat with the new message
        const updatedChat = yield chat_models_1.default.findByIdAndUpdate(chatId, { $push: { message: message._id } }, { new: true });
        if (!updatedChat) {
            console.log("Failed to update chat:", chatId);
        }
        else {
            console.log("Chat updated successfully:", updatedChat);
        }
    }
    catch (error) {
        console.error("Error in sendMessage:", error);
    }
});
exports.sendMessage = sendMessage;
// fetchAllMessages
const fetchAllMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // fetch data
        const { chatId } = req.body;
        // validation
        if (!chatId) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 400, "All fields are required");
        }
        // fetch chat
        const chat = yield chat_models_1.default.findById(chatId);
        // validation
        if (!chat) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 404, "Chat not found");
        }
        // fetch messages
        const data = yield message_models_1.default.find({ chatId: chatId })
            .populate("order")
            .lean();
        // return res
        return (0, apiResponse_helper_1.SuccessResponse)(res, 200, "Messages fetched successfully", data);
    }
    catch (error) {
        console.log(error);
        return (0, apiResponse_helper_1.ErrorResponse)(res, 500, "Internal server error");
    }
});
exports.fetchAllMessages = fetchAllMessages;
// fetchOrderHistory -> TODO
const fetchOrderHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // fetch data
        const { userId } = req.body;
        // validation
        if (!userId) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 400, "All fields are required");
        }
        // fetch user
        const user = yield user_models_1.default.findById(userId);
        // validation
        if (!user) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 404, "User not found");
        }
        // fetch orders
        const data = yield order_models_1.default.find({ sender: userId });
        // return res
        return (0, apiResponse_helper_1.SuccessResponse)(res, 200, "Orders fetched successfully", data);
    }
    catch (error) {
        console.log(error);
        return (0, apiResponse_helper_1.ErrorResponse)(res, 500, "Internal server error");
    }
});
exports.fetchOrderHistory = fetchOrderHistory;
// fetchOtherUser
const fetchOtherUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // fetch data
        const { userId } = req.body;
        // validation
        if (!userId) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 400, "All fields are required");
        }
        // fetch user
        const data = yield user_models_1.default.findById(userId).select("_id username image");
        // return res
        return (0, apiResponse_helper_1.SuccessResponse)(res, 200, "User fetched successfully", data);
    }
    catch (error) {
        console.log(error);
        return (0, apiResponse_helper_1.ErrorResponse)(res, 500, "Internal server error");
    }
});
exports.fetchOtherUser = fetchOtherUser;
// acceptOrder
const acceptOrder = (parsedData, socket) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        // validation
        if (!((_a = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _a === void 0 ? void 0 : _a.msgId)) {
            throw new Error("Invalid payload structure");
        }
        // fetch data
        const { msgId, mark } = parsedData.payload;
        // validation
        if (!msgId) {
            throw new Error("Invalid payload structure");
        }
        // fetch message
        const message = yield message_models_1.default.findById(msgId);
        // validation
        if (!message) {
            throw new Error("Message not found");
        }
        // fetch order
        const order = yield order_models_1.default.findById(message === null || message === void 0 ? void 0 : message.order);
        // validation
        if (!order) {
            throw new Error("Order not found");
        }
        // update order
        yield order_models_1.default.findByIdAndUpdate(order === null || order === void 0 ? void 0 : order._id, {
            $set: {
                status: mark,
            },
        }, { new: true });
        // update message
        yield message_models_1.default.findByIdAndUpdate(message === null || message === void 0 ? void 0 : message._id, {
            $set: {
                isSeen: true,
            },
        }, { new: true });
        if (!index_1.chatRoom.get((_b = message === null || message === void 0 ? void 0 : message.chatId) === null || _b === void 0 ? void 0 : _b.toString())) {
            index_1.chatRoom.set((_c = message === null || message === void 0 ? void 0 : message.chatId) === null || _c === void 0 ? void 0 : _c.toString(), new Map());
        }
        const participants = index_1.chatRoom.get((_d = message === null || message === void 0 ? void 0 : message.chatId) === null || _d === void 0 ? void 0 : _d.toString());
        // participants?.set(message?.sender?.toString(), socket);
        // participants?.set(message?.receiver?.toString(), socket);
        if (!participants) {
            return;
        }
        const senderWs = participants === null || participants === void 0 ? void 0 : participants.get((_e = message === null || message === void 0 ? void 0 : message.sender) === null || _e === void 0 ? void 0 : _e.toString());
        const receiverWs = participants === null || participants === void 0 ? void 0 : participants.get((_f = message === null || message === void 0 ? void 0 : message.receiver) === null || _f === void 0 ? void 0 : _f.toString());
        // send response to client
        senderWs === null || senderWs === void 0 ? void 0 : senderWs.send(JSON.stringify({
            type: "orderAccepted",
            payload: {
                success: true,
                message: "Your Order accepted, please do payment",
            },
        }));
        // send response to receiver
        receiverWs === null || receiverWs === void 0 ? void 0 : receiverWs.send(JSON.stringify({
            type: "orderAccepted",
            payload: {
                success: true,
                message: "Order accepted successfully",
            },
        }));
    }
    catch (error) {
        console.log(error);
        // send response to client
        // senderWs?.send(
        //   JSON.stringify({
        //     type: "orderStatus",
        //     payload: {
        //       success: false,
        //       message: "Order request failed",
        //     }
        //   })
        // )
        return;
    }
});
exports.acceptOrder = acceptOrder;
// fetch order of particular chat
const fetchOrdersOfChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // fetch data
        const { chatId } = req.body;
        // validation
        if (!chatId) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 400, "All fields are required");
        }
        // fetch chat
        const chat = yield chat_models_1.default.findById(chatId);
        // validation
        if (!chat) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 404, "Chat not found");
        }
        // fetch orders
        const data = yield order_models_1.default.find({ chat: chatId });
        // return res
        return (0, apiResponse_helper_1.SuccessResponse)(res, 200, "Orders fetched successfully", data);
    }
    catch (error) {
        console.log(error);
        return (0, apiResponse_helper_1.ErrorResponse)(res, 500, "Internal server error");
    }
});
exports.fetchOrdersOfChat = fetchOrdersOfChat;
const reloadChatPage = (parsedData, socket) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // validation
        if (!(parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload)) {
            throw new Error("Invalid payload structure");
        }
        // fetch data
        const { receiverId, chatId } = parsedData.payload;
        console.log("receiverId::::", receiverId);
        // validation
        if (!receiverId) {
            throw new Error("Invalid receiverId");
        }
        // fetch chat
        const chat = yield chat_models_1.default.findById(chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }
        // fetch participants
        const participants = index_1.chatRoom.get(chatId);
        // if participants exist delete user from participants
        if (!participants) {
            return;
        }
        const receiverWs = participants.get(receiverId);
        console.log("receiverWs::::", receiverWs);
        if (!receiverWs) {
            return;
        }
        // if chatRoom is empty delete chatRoom
        if (index_1.chatRoom.size === 0) {
            index_1.chatRoom.delete(chatId);
        }
        console.log("receiverWs::::", receiverWs.readyState);
        // send message to client
        receiverWs === null || receiverWs === void 0 ? void 0 : receiverWs.send(JSON.stringify({
            type: "reloadChat",
            payload: {
                success: true,
                message: "Chat reloaded successfully",
                chatId: chatId,
            },
        }));
        return;
    }
    catch (error) {
        console.log(error);
        return;
    }
});
exports.reloadChatPage = reloadChatPage;
