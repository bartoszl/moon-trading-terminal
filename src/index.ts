import { app } from "./app";
import {config} from "./config/config";
import {runMoonshotEventListener} from "./cron/moonshot-event-listener";

app.listen(config.port, () => {
  console.log(`App running on port ${config.port}`);
  runMoonshotEventListener();
});
