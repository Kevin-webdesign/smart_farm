import mongoose from "mongoose";

const cropPlanSchema = new mongoose.Schema(
  {
    cropName: {
      type: String,
      trim: true,
    },
    variety: {
      type: String,
    },
    fieldArea: {
      type: Number,
    },
    plantingDate: {
      type: Date,
    },
    expectedHarvestDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["planned", "planted", "growing", "harvested"],
      default: "planned",
    },
    expectedYield: {
      type: Number,
      required: true,
    },
    cost: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("CropPlan", cropPlanSchema);