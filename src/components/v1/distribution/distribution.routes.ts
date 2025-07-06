import { Router } from "express";
import { DistributionController } from "./distribution.controller";

const router = Router();
const controller = new DistributionController();

router.patch("/:id", controller.update);

export default router;
