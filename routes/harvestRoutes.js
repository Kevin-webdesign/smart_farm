// harvestRoutes.js
import express from "express";
import {
  getHarvestRecords,
  getHarvestRecord,
  createHarvestRecord,
  updateHarvestRecord,
  deleteHarvestRecord,
  getHarvestStats,
  getMyHarvestRecords
} from "../controllers/harvest.controller.js";
import { protect } from "../middleware/auth.midleware.js";

const router = express.Router();

// Remove authentication middleware for now
router.use(protect);

router.get("/", getHarvestRecords);
router.get("/my", getMyHarvestRecords);
router.get("/stats", getHarvestStats);
router.get("/:id", getHarvestRecord);
router.post("/", createHarvestRecord);
router.put("/:id", updateHarvestRecord);
router.delete("/:id", deleteHarvestRecord);

export default router;