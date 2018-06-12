const RedisClient = require("./RedisClient");

class RedisClientFactory {

  static getRedisClient(config, metrics) {

    if (!RedisClientFactory._instance) {
      RedisClientFactory._instance = new RedisClient(config, metrics);
    }

    return RedisClientFactory._instance;
  }
}

module.exports = {
  getRedisClient: RedisClientFactory.getRedisClient
};