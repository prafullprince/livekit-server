import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import http from "http";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";

// routes
import authRoutes from "./routes/auth.routes";
import categoryRoutes from "./routes/category.routes";
import eventRoutes from "./routes/event.routes";
import chatRoutes from "./routes/chat.routes";
import userRoutes from "./routes/user.routes";
import paymentRoutes from "./routes/payment.routes";

// dbConnect
import connectDB from "./config/mongodb";
import { cloudinaryConnect } from "./config/cloudinary";
import client from "./config/redis";
import { fetchUserChats, requestOrder, sendMessage } from "./controllers/order.controllers";

dotenv.config(); // Load environment variables

// Create Express server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// memory for socket
export const chatRoom = new Map<string, Map<string, WebSocket>>();
export const userMap = new Map<string, string>();
export let senderSocket: null | WebSocket = null;
export let receiverSocket: null | WebSocket = null;

// allowed origins
const allowedOrigins = [
  "https://www.rentabuddy.in/",
  "https://rent-a-buddy-client.vercel.app/",
];

// socket logic
io.on("connection", (socket: any) => {

  // Register user
  socket.on("register", async ({ userId }: { userId: any }) => {
    // Store userId -> socketId
    await client.set(`user:${userId}`, socket.id);

    // Store socketId -> userId
    await client.set(`socket:${socket.id}`, userId);

    // send toast of online
    io.to(socket.id).emit("online");
  });

  // registerUserInChat
  socket.on("registerUserInChat", async ({ chatId, userId }: any) => {
    console.log("registerUserInChat");

    // store chatId -> userId and socket
    await client.hset(`chat:${chatId}`, userId, socket.id);

    // store socketId -> userId
    await client.hset(`sockets:${socket.id}`, "userId", userId);

    // track all chat this socket joined
    await client.sadd(`sockets:${socket.id}:chats`, chatId);

    // send toast of online
    io.to(socket.id).emit("Connected");
  });

  // openChat
  socket.on("openChat", async ({ chatId, userId }: any) => {
    console.log("openChat");

    if(!chatId || !userId) return;

    // mark this user is online in this chat
    await client.set(`activeChat:${userId}`, chatId);
  });

  // closeChat
  socket.on("closeChat", async ({ chatId, userId }: any) => {
    console.log("closeChat");

    if(!chatId || !userId) return;

    await client.del(`activeChat:${userId}`);
  });

  // startCall
  socket.on("startCall", async ({ to, from, room }: any) => {
    console.log("startCall");

    if(!to || !from || !room) return;

    const targetSocket = await client.get(`user:${to}`);
    if(!targetSocket) return;

    // await client.set(`activeCall:${to}`, room);
    // await client.set(`activeCall:${from}`, room);

    // send to receiver
    io.to(targetSocket).emit("incomingCall", { fromUserId: from, room });
  });

  // requestOrder
  socket.on("requestOrder", (formData: any) => {
    console.log("requestOrder");
    requestOrder(formData, socket, io);
  });

  // fetchAllChat
  socket.on("fetchAllChat", ({ userId }: any) => {
    console.log("fetchAllChat");
    fetchUserChats(userId, socket, io);
  });

  // sendMessage
  socket.on("sendMessage", (messagePayload: any) => {
    console.log("sendMessage");
    sendMessage(messagePayload, io);
  });

  // On disconnect -> remove user from room
  socket.on("disconnect", async () => {
    console.log("disconnect");

    const userId = await client.get(`socket:${socket.id}`);
    const chatUserId = await client.hget(`sockets:${socket.id}`, "userId");
    const chatIds = await client.smembers(`sockets:${socket.id}:chats`);

    // remove registr user
    if (userId) {
      await client.del(`user:${userId}`);
      await client.del(`socket:${socket.id}`);
    }

    // remove register chatRoom

    // -> remove user from all chat
    if(chatUserId && chatIds) {
      chatIds.forEach( async (chatId)=>{
        await client.hdel(`chat:${chatId}`, chatUserId);
      })
    }

    // -> remove socket from all chat
    await client.del(`sockets:${socket.id}:chats`);
    await client.hdel(`sockets:${socket.id}`, "userId");
  });
});

// rate limit
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try after 1 minute.",
    });
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  // @ts-ignore
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
    safeFileNames: true,
    preserveExtension: true,
  })
);
app.use(cookieParser());
app.use(
  cors()
  //   {
  //   origin: function (origin, callback) {
  //     if (!origin || allowedOrigins.includes(origin)) {
  //       callback(null, true);
  //     } else {
  //       callback(new Error('Not allowed by CORS'));
  //     }
  //   },
  //   credentials: true
  // }
);
app.use(helmet());
app.use(compression());
// app.use(morgan("combined")); // Logs requests
app.use(globalLimiter);

// PORT
const PORT = process.env.PORT || 10000;

// db
connectDB();
cloudinaryConnect();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/event", eventRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/user", userRoutes);
app.use("/api/payment", paymentRoutes);

// Home route
app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server is Running!");
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
