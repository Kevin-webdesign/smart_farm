import Harvest from "../models/harvest.model.js";
import CropPlan from "../models/crop.model.js";
import mongoose from "mongoose";

// GET all harvest records for current user
export const getHarvestRecords = async (req, res) => {
  try {
    const harvests = await Harvest.find()
      .populate("cropPlan", "cropName variety fieldArea")
      .populate("createdBy", "userName email phone ")
      .sort({ harvestDate: -1 });
    
    res.status(200).json({
      success: true,
      data: harvests,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET all harvest records for current user
export const getMyHarvestRecords = async (req, res) => {
  try {
    const harvests = await Harvest.find({ createdBy: req.user.id })
      .populate("cropPlan", "cropName variety fieldArea")
      .populate("createdBy", "userName email")
      .sort({ harvestDate: -1 });
    
    res.status(200).json({
      success: true,
      data: harvests,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET single harvest record (only if belongs to current user)
export const getHarvestRecord = async (req, res) => {
  try {
    const harvest = await Harvest.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    })
      .populate("cropPlan", "cropName variety fieldArea expectedYield")
      .populate("createdBy", "userName email");
    
    if (!harvest) {
      return res.status(404).json({ message: "Harvest record not found" });
    }
    
    res.status(200).json({
      success: true,
      data: harvest,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// CREATE harvest record
export const createHarvestRecord = async (req, res) => {
  try {
    const {
      cropPlan,
      harvestDate = new Date(), // Default to current date if not provided
      actualYield,
      quality,
      marketPrice,
      storageLocation,
      notes,
    } = req.body;

    // Verify crop plan exists and belongs to current user
    const cropPlanExists = await CropPlan.findOne({
      _id: cropPlan,
      createdBy: req.user.id
    });
    
    if (!cropPlanExists) {
      return res.status(404).json({ 
        message: "Crop plan not found or doesn't belong to you" 
      });
    }

    const newHarvest = await Harvest.create({
      cropPlan,
      cropName: cropPlanExists.cropName,
      harvestDate,
      actualYield,
      quality,
      marketPrice,
      totalRevenue: actualYield * marketPrice,
      storageLocation,
      notes,
      createdBy: req.user.id, // Set to current user
    });

    // Update crop plan status to harvested
    await CropPlan.findByIdAndUpdate(cropPlan, { 
      status: "harvested",
      expectedHarvestDate: harvestDate // Update with actual harvest date
    });

    const populatedHarvest = await Harvest.findById(newHarvest._id)
      .populate("cropPlan", "cropName variety fieldArea expectedYield")
      .populate("createdBy", "userName email");

    res.status(201).json({
      success: true,
      message: "Harvest record created successfully",
      data: populatedHarvest,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// UPDATE harvest record (only if belongs to current user)
export const updateHarvestRecord = async (req, res) => {
  try {
    const harvest = await Harvest.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });
    
    if (!harvest) {
      return res.status(404).json({ 
        message: "Harvest record not found or you don't have permission" 
      });
    }

    // Calculate total revenue if yield or price is being updated
    if (req.body.actualYield || req.body.marketPrice) {
      const actualYield = req.body.actualYield || harvest.actualYield;
      const marketPrice = req.body.marketPrice || harvest.marketPrice;
      req.body.totalRevenue = actualYield * marketPrice;
    }

    const updatedHarvest = await Harvest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate("cropPlan", "cropName variety fieldArea expectedYield")
      .populate("createdBy", "userName email");

    res.status(200).json({
      success: true,
      message: "Harvest record updated successfully",
      data: updatedHarvest,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE harvest record (only if belongs to current user)
export const deleteHarvestRecord = async (req, res) => {
  try {
    const harvest = await Harvest.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id
    });
    
    if (!harvest) {
      return res.status(404).json({ 
        message: "Harvest record not found or you don't have permission" 
      });
    }

    // Reset crop plan status if needed
    await CropPlan.findByIdAndUpdate(harvest.cropPlan, { 
      status: "growing" 
    });

    res.status(200).json({
      success: true,
      message: "Harvest record deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET harvest statistics for current user
export const getHarvestStats = async (req, res) => {
  try {
    const totalHarvests = await Harvest.countDocuments({ createdBy: req.user.id });
    
    const totalYield = await Harvest.aggregate([
      {
        $match: { createdBy: mongoose.Types.ObjectId(req.user.id) }
      },
      {
        $group: {
          _id: null,
          totalYield: { $sum: "$actualYield" },
          totalRevenue: { $sum: "$totalRevenue" }
        }
      }
    ]);

    const qualityDistribution = await Harvest.aggregate([
      {
        $match: { createdBy: mongoose.Types.ObjectId(req.user.id) }
      },
      {
        $group: {
          _id: "$quality",
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalHarvests,
        totalYield: totalYield[0]?.totalYield || 0,
        totalRevenue: totalYield[0]?.totalRevenue || 0,
        qualityDistribution,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};