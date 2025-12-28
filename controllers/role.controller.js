import Role from '../models/role.model.js';
import mongoose from 'mongoose';

export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createRole = async (req, res) => {
  try {
    const role = new Role(req.body);
    await role.save();
    res.status(201).json(role);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update Role - Fixed version
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid role ID format' 
      });
    }

    // Check if role exists
    const existingRole = await Role.findById(id);
    if (!existingRole) {
      return res.status(404).json({ 
        success: false,
        message: 'Role not found' 
      });
    }

    // Prepare update data
    const updateData = {
      name: req.body.name || existingRole.name,
      description: req.body.description || existingRole.description,
      permissions: req.body.permissions || existingRole.permissions
    };

    // Perform update
    const updatedRole = await Role.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true,        // Return the updated document
        runValidators: true // Run model validations
      }
    );

    if (!updatedRole) {
      return res.status(404).json({ 
        success: false,
        message: 'Role not found after update attempt' 
      });
    }

    res.status(200).json({
      success: true,
      data: updatedRole,
      message: 'Role updated successfully'
    });

  } catch (err) {
    console.error('Update Role Error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update role'
    });
  }
};

// Delete Role - Fixed version
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid role ID format' 
      });
    }

    // Check if role exists and can be deleted
    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ 
        success: false,
        message: 'Role not found' 
      });
    }

    if (role.userCount > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot delete role with assigned users' 
      });
    }

    // Perform deletion
    const result = await Role.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Role not found or already deleted' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Role deleted successfully'
    });

  } catch (err) {
    console.error('Delete Role Error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete role'
    });
  }
};