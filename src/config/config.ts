import dotenv from "dotenv";

dotenv.config();

interface IConfig {
  rpcUrl: string;
  privateKey: string;
  port: string;
}

export const config: IConfig = {
  rpcUrl: process.env.RPC_URL as string,
  privateKey: process.env.PRIVATE_KEY as string,
  port: process.env.PORT as string,
}
