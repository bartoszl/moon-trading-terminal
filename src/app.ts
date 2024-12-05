import express, { Express, Request, Response } from "express";
import {MoonshotService} from "./services/moonshot.service";
import cors from 'cors';
import { config } from "./config/config";
import {parseObjectWithBigInts} from "./helpers/parseObjectWithBigInts";

const app: Express = express();

app.use(express.json());
app.use(cors())

app.post('/confirm', async (req: Request, res: Response) => {
  try {
    const { body } = req;

    const moonshotService = new MoonshotService({
      rpcUrl: config.rpcUrl,
      privateKey: config.privateKey,
    });

    const result = await moonshotService.confirmTransaction(body.signedTx);

    res.send(result)
  } catch(error) {
    res.status(500).send({ error })
  }

})

app.post("/prepare", async (req: Request, res: Response) => {
  try {
    const { body } = req;

    const moonshotService = new MoonshotService({
      rpcUrl: config.rpcUrl,
      privateKey: config.privateKey,
    });

    const transaction = await moonshotService.prepareTransaction({
      ...body,
      tokenAmount: BigInt(body.tokenAmount),
    })

    res.json(parseObjectWithBigInts(transaction));
  } catch(error) {
    res.status(500).send({ error})
  }
})


app.get("/", (_: Request, res: Response) => {
  res.send("Hello World!");
});

export { app };
