const fs = require("fs");

const messages = require("./messages.json");

fs.writeFileSync("messagesOnly.json", JSON.stringify(messages.map(({message}) =>message)))