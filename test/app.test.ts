import {ethers, JsonRpcProvider, parseEther, Wallet} from "ethers";
import request from "supertest";
import { app } from "../src/app";
import {FixedSide} from "@wen-moon-ser/moonshot-sdk-evm";

describe("App tests", () => {
  let provider: JsonRpcProvider;
  const tokenAddress = '0xD22248Cc09b468F69a65d4c519099699049dA242'
  let signer: Wallet;

  beforeAll(async () => {
    provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    signer = new Wallet(process.env.PRIVATE_KEY as string, provider);
  });

  it('Prepare and send BUY + Fixed Out', async () => {
    const response = await request(app).post("/prepare").send({
      walletAddress: signer.address,
      tokenAmount: 100 * 1e18,
      slippageBps: 50000, // 5%
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
    expect(response.body.from).toEqual('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    expect(response.body.chainId).toEqual(8453);
    expect(response.body.gasLimit).toBeTruthy();

    const ethBalanceBefore = await provider.getBalance(signer.address);

    const signedTx = await signer.signTransaction(response.body);

    const confirmResponse = await request(app).post("/confirm").send({
      signedTx,
    });

    const ethBalanceAfter = await provider.getBalance(signer.address);

    console.log(ethBalanceBefore, ethBalanceAfter, response.body.gasLimit, response.body.value);

    expect(confirmResponse.status).toEqual(200);
    expect(confirmResponse.body.status).toEqual(1);
  });

  it('Prepare and send BUY + Fixed In', async () => {
    const response = await request(app).post("/prepare").send({
      walletAddress: signer.address,
      collateralAmount: parseEther('0.001').toString(),
      slippageBps: 50000, // 5%
      tradeDirection: 'BUY',
      tokenAddress,
      fixedSide: FixedSide.IN,
    });

    expect(response.status).toEqual(200);

    const signedTx = await signer.signTransaction(response.body);

    const confirmResponse = await request(app).post("/confirm").send({
      signedTx,
    });

    expect(confirmResponse.status).toEqual(200);
    expect(confirmResponse.body.status).toEqual(1);
  });
})
