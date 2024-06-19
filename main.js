require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const { NewMessage } = require("telegram/events");
const fs = require("fs");
const { Api } = require("telegram");

const oracleService = require("./oracle/oracle.service");
const oracleHelper = require("./oracle/oracle.helper");
const { Button } = require("telegram/tl/custom/button");

// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with your actual Telegram bot token
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// MongoDB connection

const userSchema = new mongoose.Schema({
  conversationId: Number,
  exchange: String,
  apiKey: String,
  apiSecret: String,
});

const User = mongoose.model("User", userSchema);

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Welcome! Which exchange do you want to store API keys for? (binance, bybit, kucoin)", {reply_markup : {keyboard : [["Binance"], ["Bybit"], ["Kucoin"]]}}
  );
  
// Button.inline("Binance")
  bot.once("message", (msg) => {
    const exchange = msg.text.toLowerCase();
    if (!["binance", "bybit", "kucoin"].includes(exchange)) {
      bot.sendMessage(
        chatId,
        "Invalid exchange. Please choose from: binance, bybit, kucoin."
      );
      return;
    }

    bot.sendMessage(chatId, "Please enter your API Key:");
    bot.once("message", (msg) => {
      const apiKey = msg.text;

      bot.sendMessage(chatId, "Please enter your API Secret:");
      bot.once("message", async (msg) => {
        const apiSecret = msg.text;

        // Create a new user and save to MongoDB
        const newUser = new User({
          conversationId: chatId,
          exchange: exchange,
          apiKey: apiKey,
          apiSecret: apiSecret,
        });

        const savedUser = await newUser.save();

        if (savedUser === newUser) {
          bot.sendMessage(
            chatId,
            "Your API keys have been saved successfully!"
          );
        } else {
          bot.sendMessage(
            chatId,
            "There was an error saving your information. Please try again."
          );
        }
      });
    });
  });
});

(async () => {
  try {
    const t = await mongoose.connect("mongodb://mongodb:27017/trading-bot", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.log(error);
  }

  const oracle = await oracleService.getOracleClient();
  console.log("Hello from docker");
  const ORACLE_CHANNEL = Number(process.env.ORACLE_CHANNEL);

  oracle.addEventHandler((event) => {
    const trade = oracleHelper.getProperties(event.message.message);
    console.log("trade : ", trade);
    console.log("typeof trade : ", typeof trade);
    // ! Keep the below condition
    // if (Number(event.message.peerId) === ORACLE_CHANNEL) {
    //   console.log(event);
    //   console.log("event.message.peerId : ", event.message.peerId);
    //   console.log("message à victor : ", event.message.message);
    // }
  }, new NewMessage({}));
})();
