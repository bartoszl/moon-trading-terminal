import { Wallet, JsonRpcProvider, parseUnits } from "ethers";
import request from "supertest";
import { app } from "../src/app";
import {FixedSide} from "@wen-moon-ser/moonshot-sdk-evm";

describe("[/Prepare]", () => {
  const tokenAddress = '0xD22248Cc09b468F69a65d4c519099699049dA242'

  test('[BUY, OUT] Transaction object is correct', async () => {
    const provider = new JsonRpcProvider(process.env.RPC_URL);
    const signer = new Wallet(process.env.PRIVATE_KEY as string, provider);

    const tokenAmount = '100';
    const slippage = 50000; // 5%

    const response = await request(app).post("/prepare").send({
      walletAddress: signer.address,
      tokenAmount: parseUnits(tokenAmount).toString(),
      slippageBps: slippage,
      tradeDirection: 'BUY',
      tokenAddress,
      fixedSide: FixedSide.OUT,
    });

    expect(response.status).toEqual(200);
    expect(response.body.value).toBeTruthy();
    expect(response.body.to).toEqual('0xA103455889D4e22600c208D6125E0E7673106695');
    expect(response.body.data).toBeTruthy();
    expect(response.body.nonce).toBeTruthy();
    expect(response.body.gasPrice).toBeTruthy();
    expect(response.body.from).toEqual(signer.address);
    expect(response.body.chainId).toEqual(8453);
    expect(response.body.gasLimit).toBeTruthy();
  })

  // TODO: Check the rest of the transactions In/Out Buy/Sell
})
