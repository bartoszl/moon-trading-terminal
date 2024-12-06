import {JsonRpcProvider, TransactionRequest, Wallet} from 'ethers';
import {Environment, FixedSide, GetTokenAmountOptions, Moonshot, Token} from '@wen-moon-ser/moonshot-sdk-evm';
import {ChainId} from "@heliofi/launchpad-common";
import {config} from "../config/config";
import {TypedContractEvent} from "@wen-moon-ser/moonshot-sdk-evm/dist/types/evm/typechain-types/common";

interface IPrepareTransactionArgs {
  walletAddress: string;
  tokenAmount: bigint;
  slippageBps: number;
  tradeDirection: GetTokenAmountOptions['tradeDirection'];
  tokenAddress: string;
  collateralAmount: bigint;
  fixedSide: FixedSide;
}

export class MoonshotService {
  private readonly provider: JsonRpcProvider;
  private readonly moonshot: Moonshot;

  constructor() {
    this.provider = new JsonRpcProvider(config.rpcUrl);

    const signer = new Wallet(config.privateKey, this.provider);

    this.moonshot = new Moonshot({
      signer: signer,
      env: Environment.MAINNET,
    });
  }

  getMoonshot(): Moonshot {
    return this.moonshot;
  }

  getProvider(): JsonRpcProvider {
    return this.provider;
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
      value: tx.value ? this.addThresholdToCollateralIfNecessary(tx.value, tradeDirection, fixedSide) : 0,
    }

    const gasLimit = await this.provider.estimateGas(enrichedTx);

    return {
      ...enrichedTx,
      gasLimit: this.addGasLimitThreshold(gasLimit),
    }
  }

  async confirmTransaction(signedTx: string) {
    const txHash = await this.provider.send("eth_sendRawTransaction", [signedTx])

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
      return collateralAmount * 105n / 100n // Need to send a bit more otherwise does not work.
    }

    return collateralAmount;
  }

  private addGasLimitThreshold(gasLimit: bigint) {
    return gasLimit * 110n / 100n;
  }

  async fetchPastEvents(event: TypedContractEvent, fromBlock: number, toBlock: number) {
    const events = await this.moonshot.getFactory().queryFilter(event, fromBlock, toBlock);

    events.forEach(event => {
      //TODO: Process Event
      console.log(event);
    })
  }
}


