import dotenv from 'dotenv';
dotenv.config();

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import * as input from 'input';

// Type assertions for environment variables
const apiId = Number(process.env.DEV_API_ID) || Number(process.env.API_ID);
const apiHash = process.env.DEV_API_HASH || process.env.API_HASH as string;
const stringSessionStr = process.env.DEV_STRING_SESSION || process.env.STRING_SESSION as string;
const stringSession = new StringSession(stringSessionStr);

// Function to get Oracle Client
const getOracleClient = async (): Promise<TelegramClient> => {
  console.log("Loading oracle via Telegram Client...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text("Please enter your number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () =>
      await input.text("Please enter the code you received: "),
    onError: (err: Error) => console.log(err),
  });

  console.log("You should now be connected.");
  console.log(client.session.save()); // Save this string to avoid logging in again
  return client;
};

export { getOracleClient };
