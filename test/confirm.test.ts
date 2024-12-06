import {ethers, parseEther, Wallet, JsonRpcProvider, parseUnits, formatUnits} from "ethers";
import request from "supertest";
import { app } from "../src/app";
import {FixedSide} from "@wen-moon-ser/moonshot-sdk-evm";
import { erc20 } from "../src/abi/erc20";

describe("[/Confirm]", () => {
  const tokenAddress = '0xD22248Cc09b468F69a65d4c519099699049dA242'
  const moonshotContractBaseMainnetAddress = '0xA103455889D4e22600c208D6125E0E7673106695'

  test('Buy FixedOut and Sell FixedIn', async () => {
    const provider = new JsonRpcProvider(process.env.RPC_URL);
    const signer = new Wallet(process.env.PRIVATE_KEY as string, provider);
    const erc20tokenContract = new ethers.Contract(tokenAddress, erc20, signer);

    const tokenAmount = '100';
    const slippage = 50000; // 5%

    const buyResponse = await request(app).post("/prepare").send({
      walletAddress: signer.address,
      tokenAmount: parseUnits(tokenAmount).toString(),
      slippageBps: slippage,
      tradeDirection: 'BUY',
      tokenAddress,
      fixedSide: FixedSide.OUT,
    });

    expect(buyResponse.status).toEqual(200);

    const ethBalanceBeforeBuy = await provider.getBalance(signer.address);
    const tokenBalanceBeforeBuy = await erc20tokenContract.balanceOf(signer.address);

    const signedTx = await signer.signTransaction(buyResponse.body);

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

    const tokensReceived = tokenBalanceAfterBuy - tokenBalanceBeforeBuy;
    const formattedTokensReceived = Number(formatUnits(tokensReceived).toString());
    const expectedMinimumReceived = Number(tokenAmount) * (1 - (slippage/ 1e6))

    expect(ethSpent).toBeLessThan(gasUsed + BigInt(buyResponse.body.value));
    expect(formattedTokensReceived).toBeGreaterThan(expectedMinimumReceived);

    await erc20tokenContract.approve(moonshotContractBaseMainnetAddress, tokensReceived)

    const sellResponse = await request(app).post("/prepare").send({
      walletAddress: signer.address,
      tokenAmount: tokensReceived.toString(),
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

    expect(tokenBalanceAfterBuy - tokenBalanceAfterSell).toEqual(tokensReceived)
  });

  test('Buy FixedIn', async () => {
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

  // TODO: Test Sell FixedOut
})
