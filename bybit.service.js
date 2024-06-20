const { RestClientV5 } = require("bybit-api");
require("dotenv").config();

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

const getClient = async ({ apiId, apiSecret } = {}) => {
  const client = new RestClientV5({
    key: apiId || API_ID,
    secret: apiSecret || SECRET,
    testnet: true,
  });
  return client;
};

const getSpendableAmount = async (client) => {
  const {
    result: { list },
  } = await client.getWalletBalance({ accountType: "UNIFIED", coin: "USDT" });
  const tradingAccount = list[0];
  const usdtBalance = tradingAccount.coin.find(({ coin }) => coin === "USDT");
  console.log(
    "usdtBalance.availableToWithdraw : ",
    usdtBalance.availableToWithdraw
  );
  return usdtBalance.availableToWithdraw;
};

const placeOrder = async (client = new RestClientV5({
  key: API_ID,
  secret: SECRET,
  testnet: true,
})) => {
  const setLeverageResponse = await client.setLeverage({
    category: "linear",
    symbol: "WAVESUSDT",
    buyLeverage: "3",
    sellLeverage: "3",
  });
  console.log("setLeverageResponse : ", setLeverageResponse)
  const orderResponse = await client.submitOrder({ category: "linear", symbol: "WAVESUSDT" });
  console.log("orderResponse : ", orderResponse)
}

module.exports = {getSpendableAmount, getClient, getAccountInfo}