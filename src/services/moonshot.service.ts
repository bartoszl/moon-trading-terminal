import {JsonRpcProvider, TransactionRequest, Wallet} from 'ethers';
import {Environment, FixedSide, GetTokenAmountOptions, Moonshot, Token} from '@wen-moon-ser/moonshot-sdk-evm';
import {ChainId} from "@heliofi/launchpad-common";

interface IPrepareTransactionArgs {
  walletAddress: string;
  tokenAmount: bigint;
  slippageBps: number;
  tradeDirection: GetTokenAmountOptions['tradeDirection'];
  tokenAddress: string;
  collateralAmount: bigint;
  fixedSide: FixedSide;
}

interface IMoonShotServiceConstructorArgs {
  rpcUrl: string;
  privateKey: string;
}

export class MoonshotService {
  private readonly provider: JsonRpcProvider;
  private readonly moonshot: Moonshot;

  constructor({ rpcUrl, privateKey }: IMoonShotServiceConstructorArgs) {
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
    collateralAmount,
    slippageBps,
    tradeDirection,
    tokenAddress,
    fixedSide,
  } : IPrepareTransactionArgs): Promise<TransactionRequest> {
    const token = await Token.create({
      tokenAddress: tokenAddress,
      moonshot: this.moonshot,
      provider: this.provider,
    });

    let collateralAmountForTransaction = collateralAmount;
    let tokenAmountForTransaction = tokenAmount;

    if(this.shouldCalculateCollateralAmount(tradeDirection, fixedSide)) {
      collateralAmountForTransaction = await token.getCollateralAmountByTokens({
        tokenAmount,
        tradeDirection: tradeDirection,
      });
    } else {
      tokenAmountForTransaction = await token.getTokenAmountByCollateral({
        collateralAmount,
        tradeDirection,
      })
    }

    const tx = await token.prepareTx({
      slippageBps,
      tokenAmount: tokenAmountForTransaction,
      collateralAmount: collateralAmountForTransaction,
      tradeDirection: tradeDirection,
      fixedSide,
    });

    const nonce = await this.provider.getTransactionCount(walletAddress, "latest");

    const feeData = await this.provider.getFeeData();

    const enrichedTx = {
      ...tx,
      nonce,
      gasPrice: feeData.gasPrice!,
      from: walletAddress,
      chainId: ChainId.BASE,
      value: this.addThresholdToCollateralIfNecessary(tx.value!, tradeDirection, fixedSide),
    }

    const gasLimit = await this.provider.estimateGas(enrichedTx);

    return {
      ...enrichedTx,
      gasLimit: this.addGasLimitThreshold(gasLimit),
    }
  }

  async confirmTransaction(signedTx: string) {
    const txHash = await this.provider.send("eth_sendRawTransaction", [signedTx])

    // This ensures the transaction gets into the block. Does not wait for confirmation though.
    return this.provider.waitForTransaction(txHash);
  }

  /*
  Private methods
  */
  private shouldCalculateCollateralAmount(
    tradeDirection: GetTokenAmountOptions['tradeDirection'],
    fixedSide: FixedSide,
  ) {
    return (tradeDirection === 'BUY' && fixedSide === FixedSide.OUT) || (tradeDirection === 'SELL' && fixedSide === FixedSide.IN)
  }

  private addThresholdToCollateralIfNecessary(
    collateralAmount: bigint,
    tradeDirection: GetTokenAmountOptions['tradeDirection'],
    fixedSide: FixedSide,
  ) {
    if(tradeDirection === 'BUY' && fixedSide === FixedSide.OUT) {
      return collateralAmount * 105n / 100n
    }

    return collateralAmount;
  }

  private addGasLimitThreshold(gasLimit: bigint) {
    return gasLimit * 110n / 100n;
  }
}


