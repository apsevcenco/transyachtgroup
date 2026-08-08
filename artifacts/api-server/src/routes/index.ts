import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import vehiclesRouter from "./vehicles";
import proposalsRouter from "./proposals";
import contentRouter from "./content";
import requestsRouter from "./requests";
import translateRouter from "./translate";
import analyticsRouter from "./analytics";
import bookingsRouter from "./bookings";
import rentalHistoryRouter from "./rental-history";
import agentsRouter from "./agents";
import contractsRouter from "./contracts";
import uploadsRouter from "./uploads";
import sitemapsRouter from "./sitemaps";
import guidesRouter from "./guides";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(sitemapsRouter);
router.use(guidesRouter);
router.use(vehiclesRouter);
router.use(proposalsRouter);
router.use(contentRouter);
router.use(requestsRouter);
router.use(translateRouter);
router.use(analyticsRouter);
router.use(bookingsRouter);
router.use(rentalHistoryRouter);
router.use(agentsRouter);
router.use(contractsRouter);
router.use(uploadsRouter);

export default router;
