import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  conversationId: Number,
  exchange: String,
  apiKey: { type: String, required: true },
  apiSecret: { type: String, required: true },
  leverage: { type: String, default: "3" },
  walletProportion: { type: Number, default: 0.1 },
});

const User = mongoose.model("User", userSchema);

export { User };
