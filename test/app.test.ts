import {ethers, parseEther, Wallet, JsonRpcProvider, parseUnits, formatUnits} from "ethers";
import request from "supertest";
import { app } from "../src/app";
import {FixedSide} from "@wen-moon-ser/moonshot-sdk-evm";
import { erc20 } from "../src/abi/erc20";

describe("App tests", () => {
  const tokenAddress = '0xD22248Cc09b468F69a65d4c519099699049dA242'
  const moonshotContract = '0xA103455889D4e22600c208D6125E0E7673106695'

  it('Prepare and send BUY + Fixed Out', async () => {
    const provider = new JsonRpcProvider(process.env.RPC_URL);
    const signer = new Wallet(process.env.PRIVATE_KEY as string, provider);
    const erc20tokenContract = new ethers.Contract(tokenAddress, erc20, signer);

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

    const ethBalanceBeforeBuy = await provider.getBalance(signer.address);
    const tokenBalanceBeforeBuy = await erc20tokenContract.balanceOf(signer.address);

    const signedTx = await signer.signTransaction(response.body);

    const confirmResponse = await request(app).post("/confirm").send({
      signedTx,
    });

    expect(confirmResponse.status).toEqual(200);
    expect(confirmResponse.body.status).toEqual(1);

    await provider.send("evm_mine", []);

    const ethBalanceAfterBuy = await provider.getBalance(signer.address);
    const tokenBalanceAfterBuy: bigint = await erc20tokenContract.balanceOf(signer.address);

    const gasUsed = BigInt(confirmResponse.body.gasPrice)*BigInt(confirmResponse.body.gasUsed)
    const ethSpent = ethBalanceAfterBuy - ethBalanceBeforeBuy;

    const tokenDifference = tokenBalanceAfterBuy - tokenBalanceBeforeBuy;
    const tokensReceived = Number(formatUnits(tokenDifference).toString());
    const expectedMinimumReceived = Number(tokenAmount) * (1 - (slippage/ 1e6))

    expect(ethSpent).toBeLessThan(gasUsed + BigInt(response.body.value));
    expect(tokensReceived).toBeGreaterThan(expectedMinimumReceived);

    await erc20tokenContract.approve(moonshotContract, tokenDifference)

    const sellResponse = await request(app).post("/prepare").send({
      walletAddress: signer.address,
      tokenAmount: tokenDifference.toString(),
      slippageBps: slippage, // 5%
      tradeDirection: 'SELL',
      tokenAddress,
      fixedSide: FixedSide.IN,
    });

    const signedSellTx = await signer.signTransaction(sellResponse.body);

    const confirmSellResponse = await request(app).post("/confirm").send({
      signedTx: signedSellTx,
    });

    expect(confirmSellResponse.status).toEqual(200);
    expect(confirmSellResponse.body.status).toEqual(1);

    await provider.send("evm_mine", []);

    const tokenBalanceAfterSell = await erc20tokenContract.balanceOf(signer.address);

    expect(tokenBalanceAfterBuy - tokenBalanceAfterSell).toEqual(tokenDifference)
  });

  it('Prepare and send BUY + Fixed In', async () => {
    const provider = new JsonRpcProvider(process.env.RPC_URL);
    const signer = new Wallet(process.env.PRIVATE_KEY as string, provider);

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
