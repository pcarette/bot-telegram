// const messages = require("./messagesOnly.json");

// const removeEmojis = () => {
//   // parse the full message and remove all emojies
// }

const splitPerLine = (message : string): string[] => {
  // split the full message line by line and remove spaces/trim
  const lines = message.split("\n");
  return lines;
};

const getCurrency = (firstLine : string, isLong : boolean): string => {
  const currency = isLong
    ? firstLine
        .split("🟢")
        .join("")
        .split("(LONG)")
        .join("")
        .trim()
        .split(" ")[0]
    : firstLine
        .split("🔴")
        .join("")
        .split("(SHORT)")
        .join("")
        .trim()
        .split(" ")[0];
  if (!currency || typeof currency !== "string") {
    throw new Error("Unable to get currency");
  }
  return currency;
};

const getLongOrShort = (firstLine : string) => {
  // check the first line and validate if LONG or SHORT and throw if not present
  if (firstLine.includes("LONG")) {
    return true;
  } else if (firstLine.includes("(SHORT)")) {
    return false;
  } else {
    throw new Error("This message is not a trade");
  }
};

const getEntryPrices = (thirdLine : string) => {
  // get and check entry price (format);
  const entryPrices = thirdLine
    .split(":")[1]
    .replace(", ", "-")
    .split("-")
    .map((entryPrice : string) => Number(entryPrice.replace(",", ".")));
  entryPrices.map((entryPrice) => {
    if (Number.isNaN(entryPrice)) {
      throw new Error("Error while parsing entryPrices");
    }
  });
  return entryPrices;
  /**
   * go beyond : make a side function to check bybit current entry price if applicable
   */
};

const getStopLoss = (lines : string[]) => {
  // recover and check stop loss validity (format)
  const stopLossIndex = lines.findIndex((line) => line.includes("SL"));
  if (stopLossIndex === -1) {
    throw new Error("stopLoss line not found");
  }
  const stopLossLine = lines[stopLossIndex];
  const stopLoss = Number(stopLossLine.split(":")[1].replace(",", "."));
  if (Number.isNaN(stopLoss)) {
    throw new Error("Error while parsing stopLoss");
  }
  return { stopLoss, stopLossIndex };
};

const getTakeProfits = (lines : string[], stopLossIndex: number) => {
  // recover TPs list as an array
  const tpLine = lines.findIndex((line) => line.includes("🎯 TP"));
  const tps = lines
    .slice(tpLine + 1, stopLossIndex)
    .map((text) => Number(text.replace(",", ".")))
    .filter((d) => !!d);
  
  //Error handling
  tps.map((tp) => {
    if (Number.isNaN(tp)) {
      throw new Error("Error while parsing take profits");
    }
  });
  return tps;
};

const checkTrade = () => {
  // if isLongOrShort OK, check trade :
  /**
   * isLongOrShort OK
   * entry price is present
   * TP array is present
   * SL is present
   */
};

const getProperties = (message : string) => {
  //First we split the message received by lines :
  const lines = splitPerLine(message);
  const firstLine = lines[0];

  const isLong = getLongOrShort(firstLine);

  //Then we isolate currency :
  const currency = getCurrency(firstLine, isLong);

  //Step 2 : we get entryPrice :
  const entryPriceLine = lines[2];
  const entryPrices = getEntryPrices(entryPriceLine);
  //Then we get stopLoss
  const { stopLoss, stopLossIndex } = getStopLoss(lines);
  //And entryPrice
  if (!message.includes("🎯 TP")) {
    throw new Error("Take profit list not in message");
  }
  const tps = getTakeProfits(lines, stopLossIndex);

  return { isLong, currency, entryPrices: entryPrices, stopLoss, tps };
};

export{ getProperties };
