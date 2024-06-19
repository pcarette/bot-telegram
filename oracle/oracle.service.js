require("dotenv").config()

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");



const apiId = Number(process.env.DEV_API_ID) || Number(process.env.API_ID);
const apiHash = process.env.DEV_API_HASH|| process.env.API_HASH;
const stringSession = new StringSession(process.env.DEV_STRING_SESSION) ? new StringSession(process.env.DEV_STRING_SESSION) : new StringSession(process.env.STRING_SESSION); // fill this later with the value from session.save()

const getOracleClient = async () => {
  console.log("Loading oracle via  Telegram Client...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.start({
    phoneNumber: async () => await input.text("Please enter your number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () =>
      await input.text("Please enter the code you received: "),
    onError: (err) => console.log(err),
  });
  console.log("You should now be connected.");
  console.log(client.session.save()); // Save this string to avoid logging in again
  return client;
};

module.exports = {getOracleClient};