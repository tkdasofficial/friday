import { Router, type IRouter } from "express";
import healthRouter from "./health";
import fridayRouter from "./friday";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/friday", fridayRouter);

export default router;
