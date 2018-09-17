declare module "http" {

  export interface ServerResponse {
    inc?: number;
    url?: string;
  }
}