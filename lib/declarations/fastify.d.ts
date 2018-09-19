import * as http from 'http';
import { RequestHandler, Request, Response } from 'express';
import { YildizFactory } from '../bigtable/YildizFactory';

declare module "fastify" {

  export interface FastifyInstance<HttpServer = http.Server, HttpRequest = http.IncomingMessage, HttpResponse = http.ServerResponse> {
    swagger?: () => {};
    factory: YildizFactory;
    use(middleware: Middleware<http.Server, http.IncomingMessage, http.ServerResponse> |
      Middleware<http.Server, Request, Response>): () => {};
  }

  export interface FastifyReply<HttpResponse = http.ServerResponse> {
    url?: string;
  }
}