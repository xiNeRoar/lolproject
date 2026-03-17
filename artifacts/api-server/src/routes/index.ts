import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import interestsRouter from "./interests";
import eventsRouter from "./events";
import registrationsRouter from "./registrations";
import matchesRouter from "./matches";
import vodsRouter from "./vods";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/admin", adminRouter);
router.use("/interests", interestsRouter);
router.use("/events", eventsRouter);
router.use("/registrations", registrationsRouter);
router.use("/matches", matchesRouter);
router.use("/vods", vodsRouter);

export default router;
