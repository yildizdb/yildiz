import { Server } from "./http/Server";
import configGBT from "../config.GBT.json";

const server = new Server(3333, configGBT);
server.listen();
