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

const getSpendableAmount = async () => {
  const client = new RestClientV5({
    key: API_ID,
    secret: SECRET,
    testnet: true,
  });
  return client.getWalletBalance({ accountType: "UNIFIED", coin: "USDT" });
};

(async () => {
  const {
    result: { list },
  } = await getWalletBalance();
  const tradingAccount = list[0];
  const usdtBalance = tradingAccount.coin.find(({ coin }) => coin === "USDT");
  console.log("usdtBalance.availableToWithdraw : ", usdtBalance.availableToWithdraw)
  return usdtBalance.availableToWithdraw;
})();
