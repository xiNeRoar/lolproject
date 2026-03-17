import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import interestsRouter from "./interests";
import eventsRouter from "./events";
import registrationsRouter from "./registrations";
import matchesRouter from "./matches";
import vodsRouter from "./vods";
import playersRouter from "./players";
import seasonsRouter from "./seasons";
import ladderRouter from "./ladder";
import vodTimestampsRouter from "./vodTimestamps";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/admin", adminRouter);
router.use("/interests", interestsRouter);
router.use("/events", eventsRouter);
router.use("/registrations", registrationsRouter);
router.use("/matches", matchesRouter);
router.use("/vods", vodTimestampsRouter);
router.use("/vods", vodsRouter);
router.use("/players", playersRouter);
router.use("/seasons", seasonsRouter);
router.use("/ladder", ladderRouter);

export default router;
