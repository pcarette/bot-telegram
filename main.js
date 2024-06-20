require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const { NewMessage } = require("telegram/events");
const fs = require("fs");
const { Api } = require("telegram");

const oracleService = require("./oracle/oracle.service");
const oracleHelper = require("./oracle/oracle.helper");

const bybitService = require("./bybit.service");

// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with your actual Telegram bot token
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// MongoDB connection

const userSchema = new mongoose.Schema({
  conversationId: Number,
  exchange: String,
  apiKey: String,
  apiSecret: String,
  leverage: { type: String, default: "3" },
  walletProportion: { type: Number, default: 0.1 },
});

const User = mongoose.model("User", userSchema);

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Welcome! Which exchange do you want to store API keys for? (binance, bybit, kucoin)",
    { reply_markup: { keyboard: [["Binance"], ["Bybit"], ["Kucoin"]] } }
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
    const t = await mongoose.connect("mongodb://mongodb:27017/toto", {
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
      const maxQty = currencyResponse.list[0].lotSizeFilter.maxOrderQty;
      const minQty = currencyResponse.list[0].lotSizeFilter.minOrderQty;
      const qtyStep = currencyResponse.list[0].lotSizeFilter.qtyStep;
      console.log("currencyResponse: ", currencyResponse);
      console.log("spendableAmount: ", spendableAmount);
      const orderParams = {
        category: "linear",
        symbol: trade.currency + "USDT",
        side: trade.isLong ? "Buy" : "Sell",
        orderType: "Limit",
        marketUnit: "quoteCoin",
        // qty: String(
        //   spendableAmount *
        //     users[index].walletProportion *
        //     users[index].leverage
        // ),
        price: String(trade.entryPrices[0]),
        takeProfit: String(trade.tps[2]),
        stopLoss: String(trade.stopLoss),
      };
      //Define the correct qty :
      // Calculate the maximum possible quantity based on the spendable amount and entry price
      const maxPossibleQty = ((spendableAmount * users[index].leverage * users[index].walletProportion) / trade.entryPrices[0]);

      // Ensure the quantity is within the allowed range and conforms to the step size
      let validQty = Math.min(maxPossibleQty, maxQty)
      validQty = Math.max(validQty, minQty);
      validQty = Math.floor(validQty / qtyStep) * qtyStep; // Adjust to be a multiple of the step size

      orderParams.qty = (validQty).toFixed(4); // Ensure the quantity has the correct precision

      console.log("orderParams : ", orderParams);
      const orderResponse = await client.submitOrder(orderParams);
      console.log("orderResponse : ", orderResponse);
      if (!orderResponse.retCode) {
        bot.sendMessage(
          users[index].conversationId,
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
