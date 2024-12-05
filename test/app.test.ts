import {ethers, parseEther, Wallet, JsonRpcProvider, parseUnits, formatUnits} from "ethers";
import request from "supertest";
import { app } from "../src/app";
import {FixedSide} from "@wen-moon-ser/moonshot-sdk-evm";

const ERC20AbiBalance = [
  "function balanceOf(address owner) view returns (uint256)"
];

describe("App tests", () => {
  const tokenAddress = '0xD22248Cc09b468F69a65d4c519099699049dA242'

  it('Prepare and send BUY + Fixed Out', async () => {
    let provider = new JsonRpcProvider(process.env.RPC_URL);
    const signer = new Wallet(process.env.PRIVATE_KEY as string, provider);
    let erc20tokenContract = new ethers.Contract(tokenAddress, ERC20AbiBalance, provider);

    const tokenAmount = '100';
    const slippage = 50000;

    const response = await request(app).post("/prepare").send({
      walletAddress: signer.address,
      tokenAmount: parseUnits(tokenAmount).toString(),
      slippageBps: slippage, // 5%
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
    const tokenBalanceBefore = await erc20tokenContract.balanceOf(signer.address);

    const signedTx = await signer.signTransaction(response.body);

    const confirmResponse = await request(app).post("/confirm").send({
      signedTx,
    });

    expect(confirmResponse.status).toEqual(200);
    expect(confirmResponse.body.status).toEqual(1);

    await provider.send("evm_mine", []);

    // for unknown to me reason the state of blockchain in the first provider does not update.
    provider = new JsonRpcProvider(process.env.RPC_URL);
    // connect to new provider
    erc20tokenContract = new ethers.Contract(tokenAddress, ERC20AbiBalance, provider);

    const ethBalanceAfter = await provider.getBalance(signer.address);
    const tokenBalanceAfter: bigint = await erc20tokenContract.balanceOf(signer.address);

    const gasUsed = BigInt(confirmResponse.body.gasPrice)*BigInt(confirmResponse.body.gasUsed)
    const ethSpent = ethBalanceAfter - ethBalanceBefore;

    const tokenDifference = tokenBalanceAfter - tokenBalanceBefore;
    const tokensReceived = Number(formatUnits(tokenDifference).toString());
    const expectedMinimumReceived = Number(tokenAmount) * (1 - (slippage/ 1e6))
    const expectedMaximumReceived = Number(tokenAmount) * (1 + (slippage/ 1e6))

    expect(ethSpent).toBeLessThan(gasUsed + BigInt(response.body.value));
    expect(tokensReceived).toBeLessThan(expectedMaximumReceived);
    expect(tokensReceived).toBeGreaterThan(expectedMinimumReceived);
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

    await provider.send("evm_mine", []);

    expect(confirmResponse.status).toEqual(200);
    expect(confirmResponse.body.status).toEqual(1);
  });
})
