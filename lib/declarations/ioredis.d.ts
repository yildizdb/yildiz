import "./../node_modules/@types/ioredis";

declare module "ioredis" {

  export interface Redis {

    status: string;
    zadd(key: string | Buffer, ...args: Array<[number, string]>): number | void;
    zrangebyscore(key: KeyType, min: number | string, max: number | string, opt: string, optMin: number | string, optMax: number | string): any;
  }
}