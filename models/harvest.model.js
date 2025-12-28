import mongoose from "mongoose";

const harvestSchema = new mongoose.Schema(
  {
    cropPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CropPlan",
      required: true,
    },
    cropName: {
      type: String,
      required: true,
    },
    harvestDate: {
      type: Date,
      required: true,
    },
    actualYield: {
      type: Number,
      required: true,
      min: 0,
    },
    quality: {
      type: String,
      required: true,
    },
    marketPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalRevenue: {
      type: Number,
      required: true,
    },
    storageLocation: {
      type: String,
    },
    notes: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Made optional
    },
  },
  {
    timestamps: true,
  }
);

// Calculate total revenue before saving
harvestSchema.pre('save', function(next) {
  this.totalRevenue = this.actualYield * this.marketPrice;
  next();
});

export default mongoose.model("Harvest", harvestSchema);