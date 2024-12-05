import { Wallet, JsonRpcProvider, TransactionRequest } from 'ethers';
import { Moonshot, Token, FixedSide, Environment, GetTokenAmountOptions } from '@wen-moon-ser/moonshot-sdk-evm';
import {ChainId} from "@heliofi/launchpad-common";

interface IPrepareTransactionArgs {
  walletAddress: string;
  tokenAmount: bigint;
  slippageBps: number;
  tradeDirection: GetTokenAmountOptions['tradeDirection'];
  tokenAddress: string;
}

interface IMoonShotServiceContructorArgs {
  rpcUrl: string;
  privateKey: string;
}

export class MoonshotService {
  private readonly provider: JsonRpcProvider;
  private readonly moonshot: Moonshot;

  constructor({ rpcUrl, privateKey }: IMoonShotServiceContructorArgs) {
    this.provider = new JsonRpcProvider(rpcUrl);

    const signer = new Wallet(privateKey, this.provider);

    this.moonshot = new Moonshot({
      signer: signer,
      env: Environment.MAINNET,
    });
  }

  async prepareTransaction({
    walletAddress,
    tokenAmount,
    slippageBps,
    tradeDirection,
    tokenAddress
  } : IPrepareTransactionArgs): Promise<TransactionRequest> {
    const token = await Token.create({
      tokenAddress: tokenAddress,
      moonshot: this.moonshot,
      provider: this.provider,
    });

    const collateralAmount = await token.getCollateralAmountByTokens({
      tokenAmount,
      tradeDirection: tradeDirection,
    });

    const tx = await token.prepareTx({
      slippageBps,
      tokenAmount,
      collateralAmount,
      tradeDirection: tradeDirection,
      fixedSide: FixedSide.OUT,
    });

    const nonce = await this.provider.getTransactionCount(walletAddress, "latest");

    const feeData = await this.provider.getFeeData();

    const enrichedTx = {
      ...tx,
      nonce,
      gasPrice: feeData.gasPrice!,
      from: walletAddress,
      chainId: ChainId.BASE,
      value: tx.value! * 11n / 10n,
    }

    const gasLimit = await this.provider.estimateGas(enrichedTx);

    return {
      ...enrichedTx,
      gasLimit: gasLimit,
    }
  }

  async confirmTransaction(signedTx: string) {
    const txHash = await this.provider.send("eth_sendRawTransaction", [signedTx])

    return this.provider.waitForTransaction(txHash);
  }
}


