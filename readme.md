# Telegram Oracle Bot

## Overview

The Oracle is a Telegram client designed to monitor orders from a specific Telegram channel. The project automatically places orders on Bybit based on messages received from the channel, using each user's configured settings such as leverage and wallet percentage to invest in each trade.

## Features

- **Telegram Integration**: Connects to a Telegram channel to watch for new order messages.
- **Bybit Integration**: Places orders on Bybit based on the received messages.
- **User Settings**: Each user can configure their leverage and wallet percentage for investments.
- **MongoDB Storage**: Stores user settings and API keys securely.

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/telegram-oracle-bot.git
   cd telegram-oracle-bot
   ```

2. **Install dependencies**:
   ```bash
   yarn
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory with the following variables:
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   API_ID=your_bybit_api_id
   API_HASH=your_bybit_api_hash
   DEV_API_ID=your_dev_bybit_api_id (optional)
   DEV_API_HASH=your_dev_bybit_api_hash (optional)
   STRING_SESSION=your_telegram_string_session
   DEV_STRING_SESSION=your_dev_telegram_string_session (optional)
   ORACLE_CHANNEL=your_telegram_channel_id
   ```

4. **Compile TypeScript (if needed)**:
   ```bash
   yarn tsc
   ```

5. **Start the bot**:
   ```bash
   sudo docker compose up --build -d
   ```

## Usage

1. **Start the bot**: Users can interact with the bot on Telegram by sending the `/start` command to configure their settings.
2. **Configure Exchange**: Users choose an exchange (Binance, Bybit, Kucoin) and provide their API keys.
3. **Watch Orders**: The bot monitors the specified Telegram channel for order messages.
4. **Place Orders**: When an order message is detected, the bot places an order on Bybit according to each user's settings.

## Project Structure

```
project-root
├── src
│   ├── bybit.service.ts
│   ├── main.ts
│   └── oracle
│       ├── oracle.helper.ts
│       └── oracle.service.ts
├── types
│   └── input.d.ts
├── package.json
├── tsconfig.json
└── .env
```

## Contributing

Contributions are welcome! Please create an issue or submit a pull request for any changes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.