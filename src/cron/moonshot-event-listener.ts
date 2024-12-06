import {MoonshotService} from "../services/moonshot.service";

const INTERVAL = 60 * 1000 * 2; // 2 minutes

// TODO: save this in DB or sth as we will always start from the same block
let startBlock = 23303131;
const blockRange = 1000;

export const runMoonshotEventListener = () => setInterval(async () => {
  try {
    const moonshotService = new MoonshotService();
    const provider = moonshotService.getProvider();

    const lastBlock = await provider.getBlockNumber();

    let endBlock = startBlock + blockRange;

    if(endBlock > lastBlock) {
      endBlock = lastBlock;
    }

    await moonshotService.fetchPastEvents(moonshotService.getMoonshot().getFactory().filters.BuyExactIn, startBlock, endBlock);
    await moonshotService.fetchPastEvents(moonshotService.getMoonshot().getFactory().filters.BuyExactOut, startBlock, endBlock);
    // TODO: add the rest of the events

    startBlock += endBlock;
  } catch(err) {
    console.log(err);
  }
}, INTERVAL)
