import dotenv from "dotenv";
dotenv.config();

import TelegramBot from "node-telegram-bot-api";
import mongoose from "mongoose";
import { NewMessage } from "telegram/events";
import fs from "fs";
import { Api } from "telegram";

import * as oracleService from "./oracle/oracle.service";
import * as oracleHelper from "./oracle/oracle.helper";

import * as bybitService from "./bybit.service";
import { OrderParamsV5 } from "bybit-api";

// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with your actual Telegram bot token
const bot = new TelegramBot(String(process.env.TELEGRAM_BOT_TOKEN), {
  polling: true,
});

// MongoDB connection

const userSchema = new mongoose.Schema({
  conversationId: Number,
  exchange: String,
  apiKey: { type: String, required: true },
  apiSecret: { type: String, required: true },
  leverage: { type: String, default: "3" },
  walletProportion: { type: Number, default: 0.1 },
});

const User = mongoose.model("User", userSchema);

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Welcome! Which exchange do you want to store API keys for? (binance, bybit, kucoin)",
    {
      reply_markup: {
        keyboard: [
          [{ text: "Binance" }],
          [{ text: "Bybit" }],
          [{ text: "Kucoin" }],
        ],
      },
    }
  );

  // Button.inline("Binance")
  bot.once("message", (msg) => {
    const exchange = msg.text?.toLowerCase() ?? "";
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
            "Your API keys have been saved successfully!, Watching for trades..."
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
    const t = await mongoose.connect("mongodb://mongodb:27017/toto");
    console.log("MongoDB connected");
  } catch (error) {
    console.log(error);
  }

  const oracle = await oracleService.getOracleClient();
  console.log("Hello from docker");
  const ORACLE_CHANNEL = Number(process.env.ORACLE_CHANNEL);

  oracle.addEventHandler(async (event) => {
    const trade = oracleHelper.getProperties(event.message.message);
    console.log("trade : ", trade);
    console.log("typeof trade : ", typeof trade);
    const users = await User.find({}).lean();

    console.log("users : ", users);

    const clients = await Promise.all(
      users.map((user) => {
        return bybitService.getClient({
          apiId: user.apiKey,
          apiSecret: user.apiSecret,
        });
      })
    );

    clients.map(async (client, index) => {
      const setLeverageResponse = await client.setLeverage({
        category: "linear",
        symbol: trade.currency + "USDT",
        buyLeverage: users[index].leverage,
        sellLeverage: users[index].leverage,
      });

      console.log("setLeverageResponse : ", setLeverageResponse);
      const spendableAmount = await bybitService.getSpendableAmount(client);
      const { result: currencyResponse } = await client.getInstrumentsInfo({
        category: "linear",
        symbol: trade.currency + "USDT",
      });
      const maxQty = Number(currencyResponse.list[0].lotSizeFilter.maxOrderQty);
      const minQty = Number(currencyResponse.list[0].lotSizeFilter.minOrderQty);
      const qtyStep = Number(currencyResponse.list[0].lotSizeFilter.qtyStep);
      console.log("currencyResponse: ", currencyResponse);
      console.log("spendableAmount: ", spendableAmount);
      const orderParams: OrderParamsV5 = {
        category: "linear",
        symbol: trade.currency + "USDT",
        side: trade.isLong ? "Buy" : "Sell",
        orderType: "Limit",
        marketUnit: "quoteCoin",
        qty: "",
        price: String(trade.entryPrices[0]),
        takeProfit: String(trade.tps[2]),
        stopLoss: String(trade.stopLoss),
      };
      //Define the correct qty :
      // Calculate the maximum possible quantity based on the spendable amount and entry price
      const maxPossibleQty =
        (Number(spendableAmount) *
          Number(users[index].leverage) *
          users[index].walletProportion) /
        trade.entryPrices[0];

      // Ensure the quantity is within the allowed range and conforms to the step size
      let validQty = Math.min(maxPossibleQty, maxQty);
      validQty = Math.max(validQty, minQty);
      validQty = Math.floor(validQty / qtyStep) * qtyStep; // Adjust to be a multiple of the step size

      orderParams.qty = validQty.toFixed(4); // Ensure the quantity has the correct precision

      console.log("orderParams : ", orderParams);
      const orderResponse = await client.submitOrder(orderParams);
      console.log("orderResponse : ", orderResponse);
      if (!orderResponse.retCode) {
        bot.sendMessage(
          Number(users[index].conversationId),
          `Order successfully placed for ${orderParams.symbol} : \nentry : ${orderParams.price}\nTP : ${orderParams.takeProfit} \nSL : ${orderParams.stopLoss}`
        );
      }
    });

    // ! Keep the below condition
    // if (Number(event.message.peerId) === ORACLE_CHANNEL) {
    //   console.log(event);
    //   console.log("event.message.peerId : ", event.message.peerId);
    // }
  }, new NewMessage({}));
})();
