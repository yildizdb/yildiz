import { Server } from "./http/Server";

const config = (process.env.LOCAL_CONFIG) ?
  require("../config.GBT.json") :
  require("../config/bigtable.json");

const server = new Server(3333, config);
server.listen();
