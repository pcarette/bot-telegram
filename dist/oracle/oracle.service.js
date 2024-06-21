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
exports.getOracleClient = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const telegram_1 = require("telegram");
const sessions_1 = require("telegram/sessions");
const input = __importStar(require("input"));
// Type assertions for environment variables
const apiId = Number(process.env.DEV_API_ID) || Number(process.env.API_ID);
const apiHash = process.env.DEV_API_HASH || process.env.API_HASH;
const stringSessionStr = process.env.DEV_STRING_SESSION || process.env.STRING_SESSION;
const stringSession = new sessions_1.StringSession(stringSessionStr);
// Function to get Oracle Client
const getOracleClient = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Loading oracle via Telegram Client...");
    const client = new telegram_1.TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });
    yield client.start({
        phoneNumber: () => __awaiter(void 0, void 0, void 0, function* () { return yield input.text("Please enter your number: "); }),
        password: () => __awaiter(void 0, void 0, void 0, function* () { return yield input.text("Please enter your password: "); }),
        phoneCode: () => __awaiter(void 0, void 0, void 0, function* () { return yield input.text("Please enter the code you received: "); }),
        onError: (err) => console.log(err),
    });
    console.log("You should now be connected.");
    console.log(client.session.save()); // Save this string to avoid logging in again
    return client;
});
exports.getOracleClient = getOracleClient;
