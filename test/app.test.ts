import {ethers, JsonRpcProvider} from "ethers";
import request from "supertest";
import { app } from "../src/app";

describe("App tests", () => {
  let provider: JsonRpcProvider;

  beforeAll(async () => {
    provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  });

  it('works', async () => {
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

    const response = await request(app).post("/prepare").send({
      walletAddress: signer.address,
      tokenAmount: 100 * 1e18,
      slippageBps: 50000, // 5%
      tradeDirection: 'BUY',
      tokenAddress: '0xD22248Cc09b468F69a65d4c519099699049dA242',
    });

    expect(response.status).toEqual(200);

    const signedTx = await signer.signTransaction({
      ...response.body,
      value: BigInt(response.body.value) *11n/10n,
    });

    const confirmResponse = await request(app).post("/confirm").send({
      signedTx,
    });

    expect(confirmResponse.status).toEqual(200);
  });
})
