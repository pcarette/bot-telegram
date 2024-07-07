"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const userSchema = new mongoose_1.default.Schema({
    conversationId: Number,
    exchange: String,
    apiKey: { type: String, required: true },
    apiSecret: { type: String, required: true },
    leverage: { type: String, default: "3" },
    walletProportion: { type: Number, default: 0.1 },
});
const User = mongoose_1.default.model("User", userSchema);
exports.User = User;
