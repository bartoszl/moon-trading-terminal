import express, { Express, Request, Response } from "express";
import {MoonshotService} from "./services/moonshot.service";
import cors from 'cors';
import {parseObjectWithBigInts} from "./helpers/parseObjectWithBigInts";

const app: Express = express();

app.use(express.json());
app.use(cors())

app.post('/confirm', async (req: Request, res: Response) => {
  try {
    // TODO: validate body
    const { body } = req;

    const moonshotService = new MoonshotService();

    const result = await moonshotService.confirmTransaction(body.signedTx);

    res.send(result)
  } catch(error) {
    // TODO: improve error handling
    res.status(500).send({ error })
  }

})

app.post("/prepare", async (req: Request, res: Response) => {
  try {
    // TODO: validate body
    const { body } = req;

    const moonshotService = new MoonshotService();

    const transaction = await moonshotService.prepareTransaction({
      ...body,
      collateralAmount: body.collateralAmount ?  BigInt(body.collateralAmount) : 0n,
      tokenAmount: body.tokenAmount ?  BigInt(body.tokenAmount) : 0n,
    })

    res.json(parseObjectWithBigInts(transaction));
  } catch(error) {
    // TODO: improve error handling
    res.status(500).send({ error })
  }
})


app.get("/", (_: Request, res: Response) => {
  res.send("Hello World!");
});

export { app };
