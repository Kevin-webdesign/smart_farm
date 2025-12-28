import CropPlan from "../models/crop.model.js";

// GET all crop plans
export const getCropPlans = async (req, res) => {
  try {
    const crops = await CropPlan.find({ createdBy: req.user.id })
      .populate("createdBy", "userName email")
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: crops,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ADMIN: GET all crop plans with owner details
export const getAllCropPlansForStaff = async (req, res) => {
  try {
    const crops = await CropPlan.find()
      .populate("createdBy", "userName email role phone address")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: crops,
    });
  } catch (error) {
    console.error("Error fetching crop plans for admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


// GET single crop plan
export const getCropPlan = async (req, res) => {
  try {
    const crop = await CropPlan.findById(req.params.id)
      .populate("createdBy", "userName email");
    
    if (!crop) {
      return res.status(404).json({ message: "Crop plan not found" });
    }
    
    res.status(200).json({
      success: true,
      data: crop,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// CREATE crop plan
export const createCropPlan = async (req, res) => {
  try {
    const {
      cropName,
      variety,
      fieldArea,
      plantingDate,
      expectedHarvestDate,
      expectedYield,
      cost,
      notes,
    } = req.body;

    const newCrop = await CropPlan.create({
      cropName,
      variety,
      fieldArea,
      plantingDate,
      expectedHarvestDate,
      expectedYield,
      cost: cost || 0,
      notes,
      createdBy: req.user._id,
    });

    const populatedCrop = await CropPlan.findById(newCrop._id)
      .populate("createdBy", "userName email");

    res.status(201).json({
      success: true,
      message: "Crop plan created successfully",
      data: populatedCrop,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// UPDATE crop plan
export const updateCropPlan = async (req, res) => {
  try {
    const crop = await CropPlan.findById(req.params.id);
    
    if (!crop) {
      return res.status(404).json({ message: "Crop plan not found" });
    }

    const updatedCrop = await CropPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("createdBy", "userName email");

    res.status(200).json({
      success: true,
      message: "Crop plan updated successfully",
      data: updatedCrop,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE crop plan
export const deleteCropPlan = async (req, res) => {
  try {
    const crop = await CropPlan.findById(req.params.id);
    
    if (!crop) {
      return res.status(404).json({ message: "Crop plan not found" });
    }

    await CropPlan.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Crop plan deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};