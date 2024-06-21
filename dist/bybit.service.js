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
exports.getAccountInfo = exports.getClient = exports.getSpendableAmount = void 0;
const bybit_api_1 = require("bybit-api");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const API_ID = process.env.DEV_BYBIT_API_KEY;
const SECRET = process.env.DEV_BYBIT_API_SECRET;
const getAccountInfo = () => __awaiter(void 0, void 0, void 0, function* () {
    const client = new bybit_api_1.RestClientV5({
        key: API_ID,
        secret: SECRET,
        testnet: true,
    });
    return client.getAccountInfo();
});
exports.getAccountInfo = getAccountInfo;
const getClient = (_a) => __awaiter(void 0, [_a], void 0, function* ({ apiId, apiSecret }) {
    const client = new bybit_api_1.RestClientV5({
        key: apiId || API_ID,
        secret: apiSecret || SECRET,
        testnet: true,
    });
    return client;
});
exports.getClient = getClient;
;
const getSpendableAmount = (client) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { result: { list }, } = yield client.getWalletBalance({ accountType: "UNIFIED", coin: "USDT" });
    const tradingAccount = list[0];
    const usdtBalance = tradingAccount.coin.find(({ coin }) => coin === "USDT");
    return (_a = usdtBalance === null || usdtBalance === void 0 ? void 0 : usdtBalance.availableToWithdraw) !== null && _a !== void 0 ? _a : 0;
});
exports.getSpendableAmount = getSpendableAmount;
