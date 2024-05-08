const { NewMessage } = require("telegram/events");

const oracleService = require("./oracle/oracle");


(async () => {
  const oracle = await oracleService.getOracleClient();
  console.log("Hello from docker")
  oracle.addEventHandler((event) => {
    console.log(event)
    console.log("event.message.peerId : ", event.message.peerId)
     
  }, new NewMessage({}))
})();
