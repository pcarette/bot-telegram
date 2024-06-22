import { RestClientV5 } from "bybit-api";

import dotenv from 'dotenv';
dotenv.config();

interface ClientParams {
  apiId?: string;
  apiSecret?: string;
}

const API_ID = process.env.DEV_BYBIT_API_KEY;
const SECRET = process.env.DEV_BYBIT_API_SECRET;

const getAccountInfo = async () => {
  const client = new RestClientV5({
    key: API_ID,
    secret: SECRET,
    testnet: true,
  });
  return client.getAccountInfo();
};

const getClient = async ({ apiId, apiSecret }: ClientParams): Promise<RestClientV5> => {
  const client = new RestClientV5({
    key: apiId || API_ID,
    secret: apiSecret || SECRET,
    testnet: true,
  });
  return client
};;

const getSpendableAmount = async (client : RestClientV5) => {
  const {
    result: { list },
  } = await client.getWalletBalance({ accountType: "UNIFIED", coin: "USDT" });
  const tradingAccount = list[0];
  const usdtBalance = tradingAccount.coin.find(({ coin }) => coin === "USDT");
  return usdtBalance?.availableToWithdraw ?? 0;
};

// const placeOrder = async (client = new RestClientV5({
//   key: API_ID,
//   secret: SECRET,
//   testnet: true,
// })) => {
//   await client.setLeverage({
//     category: "linear",
//     symbol: "WAVESUSDT",
//     buyLeverage: "3",
//     sellLeverage: "3",
//   });
//   const orderResponse = await client.submitOrder({ category: "linear", symbol: "WAVESUSDT" });
//   console.log("orderResponse : ", orderResponse)
// }

export {getSpendableAmount, getClient, getAccountInfo}