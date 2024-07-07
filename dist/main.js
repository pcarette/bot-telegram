"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const mongoose_1 = __importDefault(require("mongoose"));
const events_1 = require("telegram/events");
const user_model_1 = require("./model/user.model");
const oracleService = __importStar(require("./oracle/oracle.service"));
const oracleHelper = __importStar(require("./oracle/oracle.helper"));
const bybitService = __importStar(require("./exchanges/bybit/services/bybit.service"));
// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with your actual Telegram bot token
const bot = new node_telegram_bot_api_1.default(String(process.env.TELEGRAM_BOT_TOKEN), {
    polling: true,
});
// MongoDB connection
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Welcome! Which exchange do you want to store API keys for? (binance, bybit, kucoin)", {
        reply_markup: {
            keyboard: [
                [{ text: "Binance" }],
                [{ text: "Bybit" }],
                [{ text: "Kucoin" }],
            ],
        },
    });
    // Button.inline("Binance")
    bot.once("message", (msg) => {
        var _a, _b;
        const exchange = (_b = (_a = msg.text) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : "";
        if (!["binance", "bybit", "kucoin"].includes(exchange)) {
            bot.sendMessage(chatId, "Invalid exchange. Please choose from: binance, bybit, kucoin.");
            return;
        }
        bot.sendMessage(chatId, "Please enter your API Key:");
        bot.once("message", (msg) => {
            const apiKey = msg.text;
            bot.sendMessage(chatId, "Please enter your API Secret:");
            bot.once("message", (msg) => __awaiter(void 0, void 0, void 0, function* () {
                const apiSecret = msg.text;
                // Create a new user and save to MongoDB
                const newUser = new user_model_1.User({ conversationId: msg.chat.id, apiKey, apiSecret });
                const savedUser = yield newUser.save();
                if (savedUser === newUser) {
                    bot.sendMessage(chatId, "Your API keys have been saved successfully!, Watching for trades...");
                }
                else {
                    bot.sendMessage(chatId, "There was an error saving your information. Please try again.");
                }
            }));
        });
    });
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const t = yield mongoose_1.default.connect("mongodb://mongodb:27017/toto");
        console.log("MongoDB connected");
    }
    catch (error) {
        console.log(error);
    }
    const oracle = yield oracleService.getOracleClient();
    console.log("Hello from docker");
    const ORACLE_CHANNEL = Number(process.env.ORACLE_CHANNEL);
    oracle.addEventHandler((event) => __awaiter(void 0, void 0, void 0, function* () {
        // ! Keep the below condition
        if (Number(event.message.peerId) === ORACLE_CHANNEL) {
            let trade = null;
            try {
                trade = oracleHelper.getProperties(event.message.message);
            }
            catch (error) {
                //TODO: Handle the bad parsing for non-trades messages
                return;
            }
            const users = yield user_model_1.User.find({}).lean();
            const clients = yield Promise.all(users.map((user) => {
                return bybitService.getClient({
                    apiId: user.apiKey,
                    apiSecret: user.apiSecret,
                });
            }));
            clients.map((client, index) => __awaiter(void 0, void 0, void 0, function* () {
                //We get the user from our previous array :
                const user = users[index];
                //TODO : Allow opportunity to set leverage BY cuurrency
                const setLeverageResponse = yield client.setLeverage({
                    category: "linear",
                    symbol: trade.currency + "USDT",
                    buyLeverage: user.leverage,
                    sellLeverage: user.leverage,
                });
                console.log("setLeverageResponse : ", setLeverageResponse);
                const spendableAmount = yield bybitService.getSpendableAmount(client);
                const { result: currencyResponse } = yield client.getInstrumentsInfo({
                    category: "linear",
                    symbol: trade.currency + "USDT",
                });
                const maxQty = Number(currencyResponse.list[0].lotSizeFilter.maxOrderQty);
                const minQty = Number(currencyResponse.list[0].lotSizeFilter.minOrderQty);
                const qtyStep = Number(currencyResponse.list[0].lotSizeFilter.qtyStep);
                console.log("currencyResponse: ", currencyResponse);
                console.log("spendableAmount: ", spendableAmount);
                const orderParams = {
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
                const maxPossibleQty = (Number(spendableAmount) *
                    Number(user.leverage) *
                    user.walletProportion) /
                    trade.entryPrices[0];
                // Ensure the quantity is within the allowed range and conforms to the step size
                let validQty = Math.min(maxPossibleQty, maxQty);
                validQty = Math.max(validQty, minQty);
                validQty = Math.floor(validQty / qtyStep) * qtyStep; // Adjust to be a multiple of the step size
                orderParams.qty = validQty.toFixed(4); // Ensure the quantity has the correct precision
                const orderResponse = yield client.submitOrder(orderParams);
                if (!orderResponse.retCode) {
                    bot.sendMessage(Number(user.conversationId), `Order successfully placed for ${orderParams.symbol} : \nentry : ${orderParams.price}\nTP : ${orderParams.takeProfit} \nSL : ${orderParams.stopLoss}`);
                }
                else {
                    bot.sendMessage(Number(user.conversationId), `Failed to place order for ${orderParams.symbol} : \nentry : ${orderParams.price}\nTP : ${orderParams.takeProfit} \nSL : ${orderParams.stopLoss}`);
                }
            }));
            console.log(event);
            console.log("event.message.peerId : ", event.message.peerId);
        }
    }), new events_1.NewMessage({}));
}))();
