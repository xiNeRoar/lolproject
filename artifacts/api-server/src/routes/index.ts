import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import authRouter from "./auth";
import teamsRouter from "./teams";
import playersRouter from "./players";
import matchesRouter from "./matches";
import vodsRouter from "./vods";
import vodTimestampsRouter from "./vodTimestamps";
import eventsRouter from "./events";
import registrationsRouter from "./registrations";
import seasonsRouter from "./seasons";
import ladderRouter from "./ladder";
import ladderSettingsRouter from "./ladderSettings";
import eloHistoryRouter from "./eloHistory";
import seasonChampionsRouter from "./seasonChampions";
import playerBadgesRouter from "./playerBadges";
import replaysRouter from "./replays";
import notificationsRouter from "./notifications";
import bansRouter from "./bans";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/admin", adminRouter);
router.use("/auth", authRouter);
router.use("/teams", teamsRouter);
router.use("/players", playersRouter);
router.use("/matches", matchesRouter);
router.use("/vods", vodTimestampsRouter); // mount before vodsRouter: handles /:id/timestamps and /timestamps/:id
router.use("/vods", vodsRouter);
router.use("/events", eventsRouter);
router.use("/registrations", registrationsRouter);
router.use("/seasons", seasonsRouter);
router.use("/ladder", ladderRouter);
router.use("/ladder-settings", ladderSettingsRouter);
router.use("/elo-history", eloHistoryRouter);
router.use("/season-champions", seasonChampionsRouter);
router.use("/player-badges", playerBadgesRouter);
router.use("/replays", replaysRouter);
router.use("/notifications", notificationsRouter);
router.use("/bans", bansRouter);

export default router;
