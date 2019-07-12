import { Server } from "./http/Server";

const config = (process.env.LOCAL_CONFIG) ?
  require("../config.GBT.json") :
  require("../config/bigtable.json");

if (process.env.LOCAL_CONFIG) {
  process.env["BIGTABLE_EMULATOR_HOST"] = "127.0.0.1:8086";
  process.env["STAGE"] = "LOCAL";
}

const server = new Server(3333, config);
server.listen();
