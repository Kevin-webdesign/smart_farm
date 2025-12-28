// inputsRoutes.js
import express from "express";
import {
  getInputs,
  createInput,
  updateInput,
  deleteInput,
  getInputById,
} from "../controllers/inputs.controller.js";
import { protect } from "../middleware/auth.midleware.js";

const router = express.Router();

router.use(protect);

// Routes
router.get("/", getInputs);
router.get("/:id", getInputById);
router.post("/", createInput);
router.put("/:id", updateInput);
router.delete("/:id", deleteInput);

export default router;