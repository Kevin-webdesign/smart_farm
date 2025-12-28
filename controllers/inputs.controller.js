// inputs.controller.js
import Inputs from "../models/inputs.model.js";

// Create input
export const createInput = async (req, res) => {
  try {
    const { Name, amount, Inputdate = new Date(), description } = req.body;

    const newInput = await Inputs.create({
      Name,
      amount,
      Inputdate,
      description,
      createdBy: req.user.id,
    });

    // populate createdBy (fetch username & email from User model)
    const populatedInput = await Inputs.findById(newInput._id).populate(
      "createdBy",
      "userName email"
    );

    res.status(201).json({
      success: true,
      message: "Input added successfully",
      data: populatedInput,
    });
  } catch (error) {
    console.error("Error in createInput:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all inputs (user sees their own, admin sees all)
export const getInputs = async (req, res) => {
  try {
    let query = {};
    
    // If user is not admin, only show their own inputs
    if (req.user.role !== 'admin') {
      query.createdBy = req.user.id;
    }
    
    const inputs = await Inputs.find(query).populate("createdBy", "userName email");
    
    res.status(200).json({
      success: true,
      data: inputs,
    });
  } catch (error) {
    console.error("Error in getInputs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update input - ensure users can only update their own inputs unless admin
export const updateInput = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First find the input to check ownership
    const existingInput = await Inputs.findById(id);
    
    if (!existingInput) {
      return res.status(404).json({ message: "Input not found" });
    }
    
    // Check if user owns this input or is admin
    if (existingInput.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied. You can only update your own inputs." });
    }
    
    const updated = await Inputs.findByIdAndUpdate(id, req.body, {
      new: true,
    }).populate("createdBy", "userName email");

    res.status(200).json({
      success: true,
      message: "Input updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error in updateInput:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete input with ownership check
export const deleteInput = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First find the input to check ownership
    const existingInput = await Inputs.findById(id);
    
    if (!existingInput) {
      return res.status(404).json({ message: "Input not found" });
    }
    
    // Check if user owns this input or is admin
    if (existingInput.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied. You can only delete your own inputs." });
    }
    
    await Inputs.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: "Input deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteInput:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single input with ownership check
export const getInputById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const input = await Inputs.findById(id).populate("createdBy", "userName email");
    
    if (!input) {
      return res.status(404).json({ message: "Input not found" });
    }
    
    // Check if user owns this input or is admin
    if (input.createdBy._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied. You can only view your own inputs." });
    }
    
    res.status(200).json({
      success: true,
      data: input,
    });
  } catch (error) {
    console.error("Error in getInputById:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};