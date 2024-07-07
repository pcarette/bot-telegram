import dotenv from "dotenv";
dotenv.config();

import TelegramBot from "node-telegram-bot-api";
import mongoose from "mongoose";
import { NewMessage } from "telegram/events";

import { User } from "./model/user.model";

import * as oracleService from "./oracle/oracle.service";
import * as oracleHelper from "./oracle/oracle.helper";

import * as bybitService from "./exchanges/bybit/services/bybit.service";
import { OrderParamsV5 } from "bybit-api";

// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with your actual Telegram bot token
const bot = new TelegramBot(String(process.env.TELEGRAM_BOT_TOKEN), {
  polling: true,
});

// MongoDB connection

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
        const newUser = new User({conversationId : msg.chat.id, apiKey, apiSecret});

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
    // ! Keep the below condition
    if (Number(event.message.peerId) === ORACLE_CHANNEL) {
      let trade = null;
      try {
        trade = oracleHelper.getProperties(event.message.message);
      } catch (error) {
        //TODO: Handle the bad parsing for non-trades messages
        return;
      }

      const users = await User.find({}).lean();

      const clients = await Promise.all(
        users.map((user) => {
          return bybitService.getClient({
            apiId: user.apiKey,
            apiSecret: user.apiSecret,
          });
        })
      );

      clients.map(async (client, index) => {
        //We get the user from our previous array :
        const user = users[index];

        //TODO : Allow opportunity to set leverage BY cuurrency

        const setLeverageResponse = await client.setLeverage({
          category: "linear",
          symbol: trade.currency + "USDT",
          buyLeverage: user.leverage,
          sellLeverage: user.leverage,
        });

        console.log("setLeverageResponse : ", setLeverageResponse);
        const spendableAmount = await bybitService.getSpendableAmount(client);
        const { result: currencyResponse } = await client.getInstrumentsInfo({
          category: "linear",
          symbol: trade.currency + "USDT",
        });
        const maxQty = Number(
          currencyResponse.list[0].lotSizeFilter.maxOrderQty
        );
        const minQty = Number(
          currencyResponse.list[0].lotSizeFilter.minOrderQty
        );
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
            Number(user.leverage) *
            user.walletProportion) /
          trade.entryPrices[0];

        // Ensure the quantity is within the allowed range and conforms to the step size
        let validQty = Math.min(maxPossibleQty, maxQty);
        validQty = Math.max(validQty, minQty);
        validQty = Math.floor(validQty / qtyStep) * qtyStep; // Adjust to be a multiple of the step size

        orderParams.qty = validQty.toFixed(4); // Ensure the quantity has the correct precision

        const orderResponse = await client.submitOrder(orderParams);

        if (!orderResponse.retCode) {
          bot.sendMessage(
            Number(user.conversationId),
            `Order successfully placed for ${orderParams.symbol} : \nentry : ${orderParams.price}\nTP : ${orderParams.takeProfit} \nSL : ${orderParams.stopLoss}`
          );
        } else {
          bot.sendMessage(
            Number(user.conversationId),
            `Failed to place order for ${orderParams.symbol} : \nentry : ${orderParams.price}\nTP : ${orderParams.takeProfit} \nSL : ${orderParams.stopLoss}`
          );
        }
      });

      console.log(event);
      console.log("event.message.peerId : ", event.message.peerId);
    }
  }, new NewMessage({}));
})();
