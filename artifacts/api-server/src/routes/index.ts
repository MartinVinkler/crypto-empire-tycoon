import { Router, type IRouter } from "express";
import healthRouter from "./health";
import map3dRouter from "./map3d";
import openaiRouter from "./openai";
import overpassRouter from "./overpass";

const router: IRouter = Router();

router.use(healthRouter);
router.use(overpassRouter);
router.use(map3dRouter);
router.use(openaiRouter);

export default router;
