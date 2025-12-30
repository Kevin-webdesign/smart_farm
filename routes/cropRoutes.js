import express from "express";
import {
  getCropPlans,
  getCropPlan,
  createCropPlan,
  updateCropPlan,
  deleteCropPlan,
  getAllCropPlans,
} from "../controllers/crop.controller.js";
import { protect } from "../middleware/auth.midleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get("/", getCropPlans);
router.get("/staff",protect, getAllCropPlans);
router.get("/:id",protect, getCropPlan);
router.post("/",protect, createCropPlan);
router.put("/:id", protect , updateCropPlan);
router.delete("/:id", protect , deleteCropPlan);

export default router;