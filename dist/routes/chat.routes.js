"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import express and make router instances
const express_1 = __importDefault(require("express"));
// router instances
const router = express_1.default.Router();
// import controllers
const auth_middleware_1 = require("../middleware/auth.middleware");
const order_controllers_1 = require("../controllers/order.controllers");
// routes
router.post('/createOrder', auth_middleware_1.auth, auth_middleware_1.isBuddy, order_controllers_1.requestOrder);
// router.post('/fetchChat', auth, fetchChat);
router.post('/fetchAllMessages', auth_middleware_1.auth, order_controllers_1.fetchAllMessages);
router.post('/fetchOrderHistory', auth_middleware_1.auth, order_controllers_1.fetchOrderHistory);
router.post('/fetchOtherUser', order_controllers_1.fetchOtherUser);
router.post('/fetchOrdersOfChat', auth_middleware_1.auth, order_controllers_1.fetchOrdersOfChat);
// export router
exports.default = router;
