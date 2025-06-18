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
exports.reloadChatPage = exports.fetchOrdersOfChat = exports.acceptOrder = exports.fetchOtherUser = exports.fetchOrderHistory = exports.fetchChat = exports.fetchAllMessages = exports.sendMessage = exports.registerUserInChatRoom = exports.removeUserFromChatRoom = exports.requestOrder = exports.unseenMessageOfParticularChatIdOfUser = exports.markAsRead = exports.unseenMessages = exports.fetchUserChats = void 0;
const apiResponse_helper_1 = require("../helper/apiResponse.helper");
const user_models_1 = __importDefault(require("../models/user.models"));
const event_models_1 = __importDefault(require("../models/event.models"));
const chat_models_1 = __importDefault(require("../models/chat.models"));
const order_models_1 = __importDefault(require("../models/order.models"));
const index_1 = require("../index");
const message_models_1 = __importDefault(require("../models/message.models"));
// fetchUserChats
const fetchUserChats = (parsedData, socket) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // validation
        if (!(parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload)) {
            throw new Error("Invalid payload structure");
        }
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
        // fetch chats
        const chats = yield chat_models_1.default.find({ participants: userId })
            .populate({
            path: "participants",
            select: "_id username image",
        })
            .populate({
            path: "message",
            select: "_id sender",
        }).lean().exec();
        // send message to client
        socket.send(JSON.stringify({
            type: "fetchUserAllChats",
            payload: {
                success: true,
                message: "User chats fetched successfully",
                data: chats,
            },
        }));
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
                payload: counts
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
const requestOrder = (parsedData, socket) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;
    try {
        // validation
        if (!((_b = (_a = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _a === void 0 ? void 0 : _a.formData) === null || _b === void 0 ? void 0 : _b.location) ||
            !((_d = (_c = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _c === void 0 ? void 0 : _c.formData) === null || _d === void 0 ? void 0 : _d.date) ||
            !((_f = (_e = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _e === void 0 ? void 0 : _e.formData) === null || _f === void 0 ? void 0 : _f.time) ||
            !((_h = (_g = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _g === void 0 ? void 0 : _g.formData) === null || _h === void 0 ? void 0 : _h.additionalInfo) ||
            !((_k = (_j = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _j === void 0 ? void 0 : _j.formData) === null || _k === void 0 ? void 0 : _k.cabFare) ||
            !((_m = (_l = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _l === void 0 ? void 0 : _l.formData) === null || _m === void 0 ? void 0 : _m.totalPrice) ||
            !((_p = (_o = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _o === void 0 ? void 0 : _o.formData) === null || _p === void 0 ? void 0 : _p.eventId) ||
            !((_r = (_q = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _q === void 0 ? void 0 : _q.formData) === null || _r === void 0 ? void 0 : _r.sender) ||
            !((_t = (_s = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _s === void 0 ? void 0 : _s.formData) === null || _t === void 0 ? void 0 : _t.receiver) ||
            !((_v = (_u = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _u === void 0 ? void 0 : _u.formData) === null || _v === void 0 ? void 0 : _v.subId) ||
            !((_x = (_w = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _w === void 0 ? void 0 : _w.formData) === null || _x === void 0 ? void 0 : _x.unit)) {
            throw new Error("Invalid payload structure");
        }
        // fetch data
        const { location, date, time, additionalInfo, cabFare, totalPrice, eventId, sender, receiver, subId, unit, } = parsedData.payload.formData;
        console.log("first", parsedData.payload.formData);
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
            text: parsedData.payload.formData,
            type: "order",
            order: order._id,
        });
        yield message.save();
        // update chat with the new message
        yield chat_models_1.default.findByIdAndUpdate(chat === null || chat === void 0 ? void 0 : chat._id, { $push: { message: message._id } }, { new: true });
        // update chatRoom
        if (!(index_1.chatRoom === null || index_1.chatRoom === void 0 ? void 0 : index_1.chatRoom.has((_y = chat === null || chat === void 0 ? void 0 : chat._id) === null || _y === void 0 ? void 0 : _y.toString()))) {
            index_1.chatRoom === null || index_1.chatRoom === void 0 ? void 0 : index_1.chatRoom.set((_z = chat === null || chat === void 0 ? void 0 : chat._id) === null || _z === void 0 ? void 0 : _z.toString(), new Map());
        }
        let participants = index_1.chatRoom.get((_0 = chat === null || chat === void 0 ? void 0 : chat._id) === null || _0 === void 0 ? void 0 : _0.toString());
        if (participants) {
            const senderId = (_1 = message === null || message === void 0 ? void 0 : message.sender) === null || _1 === void 0 ? void 0 : _1.toString();
            const existingSocket = participants.get(senderId);
            if (!existingSocket || existingSocket.readyState !== WebSocket.OPEN) {
                participants.set(senderId, socket);
            }
        }
        const senderWs = participants === null || participants === void 0 ? void 0 : participants.get((_2 = message === null || message === void 0 ? void 0 : message.sender) === null || _2 === void 0 ? void 0 : _2.toString());
        const receiverWs = participants === null || participants === void 0 ? void 0 : participants.get((_3 = message === null || message === void 0 ? void 0 : message.receiver) === null || _3 === void 0 ? void 0 : _3.toString());
        console.log("senderWs", senderWs === null || senderWs === void 0 ? void 0 : senderWs.readyState);
        console.log("open websocket", WebSocket.OPEN);
        console.log("receiverWs", receiverWs === null || receiverWs === void 0 ? void 0 : receiverWs.readyState);
        // // send message to sender
        // if (senderWs && senderWs?.readyState === WebSocket.OPEN) {
        //   senderWs?.send(
        //     JSON.stringify({ type: "receiveMessage", payload: message })
        //   );
        // } else {
        //   console.log(`Sender socket for ${sender} is not open`);
        // }
        // send message to receiver
        if (receiverWs && (receiverWs === null || receiverWs === void 0 ? void 0 : receiverWs.readyState) === WebSocket.OPEN) {
            receiverWs.send(JSON.stringify({ type: "receiveMessage", payload: message }));
        }
        else {
            console.log(`Receiver socket for ${receiver} is not open`);
        }
        // if(receiverWs && receiverWs?.readyState === WebSocket.OPEN){
        //   receiverWs?.send(
        //     JSON.stringify({
        //       type: "fetchUserAllChats",
        //       payload: {
        //         success: true,
        //         message: "User chats fetched successfully",
        //         data: chat,
        //       },
        //     })
        //   );
        // }
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
        if (senderWs && (senderWs === null || senderWs === void 0 ? void 0 : senderWs.readyState) === WebSocket.OPEN) {
            senderWs === null || senderWs === void 0 ? void 0 : senderWs.send(JSON.stringify({
                type: "orderStatus",
                payload: {
                    success: true,
                    message: "Order request sent successfully",
                    data: message,
                },
            }));
        }
        return;
    }
    catch (error) {
        console.log("error", error);
        // send response to client
        // senderWs?.send(
        //   JSON.stringify({
        //     type: "orderStatus",
        //     payload: {
        //       success: false,
        //       message: "Order request failed",
        //     },
        //   })
        // );
        throw new Error("Order request failed");
    }
});
exports.requestOrder = requestOrder;
// removeChatFromRoom
const removeUserFromChatRoom = (chatId, userId) => {
    try {
        // fetch participants
        const participants = index_1.chatRoom.get(chatId);
        // if participants exist delete user from participants
        if (participants) {
            participants.delete(userId);
        }
        // if chatRoom is empty delete chatRoom
        if (index_1.chatRoom.size === 0) {
            index_1.chatRoom.delete(chatId);
        }
    }
    catch (error) {
        console.log("error", error);
    }
};
exports.removeUserFromChatRoom = removeUserFromChatRoom;
// registerUserInChatRoom
const registerUserInChatRoom = (parsedData, socket) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { payload } = parsedData;
        const { chatId, userId } = payload || {};
        // Simple and clear validation
        if (!chatId || !userId) {
            throw new Error("chatId and userId are required");
        }
        // Initialize chat room if it doesn't exist
        if (!index_1.chatRoom.has(chatId)) {
            index_1.chatRoom.set(chatId, new Map());
        }
        // Add or update participant socket
        const participants = index_1.chatRoom.get(chatId);
        participants.set(userId, socket); // Always update to ensure the latest socket
        // Handle disconnection
        socket.on("disconnect", () => {
            (0, exports.removeUserFromChatRoom)(chatId, userId);
        });
        console.log(`User ${userId} registered in chat room ${chatId}`);
    }
    catch (error) {
        console.error("Error in registerUserInChatRoom:", error);
    }
});
exports.registerUserInChatRoom = registerUserInChatRoom;
// sendMessage
const sendMessage = (parsedData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validate payload
        if (!(parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) ||
            !parsedData.payload.sender ||
            !parsedData.payload.receiver ||
            !parsedData.payload.chatId ||
            !parsedData.payload.text) {
            console.log("Invalid data received:", parsedData);
            return;
        }
        const { sender, receiver, chatId, text } = parsedData.payload;
        // Get chat participants
        const participants = index_1.chatRoom.get(chatId);
        if (!participants) {
            console.log("No active participants found for chatId:", chatId);
            return;
        }
        const senderSocket = participants === null || participants === void 0 ? void 0 : participants.get(sender);
        const receiverSocket = participants === null || participants === void 0 ? void 0 : participants.get(receiver);
        console.log("senderSocket", senderSocket === null || senderSocket === void 0 ? void 0 : senderSocket.readyState);
        console.log("receiverSocket", receiverSocket === null || receiverSocket === void 0 ? void 0 : receiverSocket.readyState);
        const isReceiverOnline = (receiverSocket === null || receiverSocket === void 0 ? void 0 : receiverSocket.readyState) === WebSocket.OPEN;
        const isChatOpen = (index_1.userMap === null || index_1.userMap === void 0 ? void 0 : index_1.userMap.get(receiver)) === chatId;
        console.log("isReceiverOnline", isReceiverOnline);
        console.log("isChatOpen", isChatOpen);
        // Create and save message
        const message = new message_models_1.default({ sender, receiver, chatId, text, isSeen: isReceiverOnline && isChatOpen });
        yield message.save();
        // Send message to sender
        if ((senderSocket === null || senderSocket === void 0 ? void 0 : senderSocket.readyState) === WebSocket.OPEN) {
            senderSocket.send(JSON.stringify({ type: "receiveMessage", payload: message }));
        }
        else {
            console.log(`Sender socket for ${sender} is not open`);
        }
        // Send message to receiver
        if (isReceiverOnline) {
            receiverSocket.send(JSON.stringify({ type: "receiveMessage", payload: message }));
        }
        else {
            console.log(`Receiver socket for ${receiver} is not open`);
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
// fetchChat
const fetchChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // fetch data
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
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
        // fetch chats
        const data = yield chat_models_1.default.find({ participants: userId })
            .populate({
            path: "participants",
            select: "_id username image",
        })
            .populate({
            path: "message",
            select: "_id text isSeen receiver",
        });
        // return res
        return (0, apiResponse_helper_1.SuccessResponse)(res, 200, "Chats fetched successfully", data);
    }
    catch (error) {
        console.log(error);
        return (0, apiResponse_helper_1.ErrorResponse)(res, 500, "Internal server error");
    }
});
exports.fetchChat = fetchChat;
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
