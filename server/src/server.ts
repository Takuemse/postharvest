import { app } from "./app";
import { env } from "./config/env";
import { startSweeps } from "./jobs/scheduler";

app.listen(env.PORT, () => console.log(`API running on http://localhost:${env.PORT}`));

if (env.NODE_ENV !== "test") startSweeps();