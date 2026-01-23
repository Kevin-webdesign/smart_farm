import { db } from "../config/db.js";


// Get all roles
export const getRoles = async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM roles ORDER BY created_at DESC`);
    res.json({ success: true, data: result[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create Role
export const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    // Check if role already exists
    const exists = await db.query(`SELECT id FROM roles WHERE name=?`, [name]);
    if (exists[0].length) {
      return res.status(400).json({ success: false, message: "Role name already exists" });
    }

    const result = await db.query(
      `INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)`,
      [name, description, JSON.stringify(permissions)]
    );

    const newRoleId = result[0].insertId;
    const newRole = await db.query(`SELECT * FROM roles WHERE id=?`, [newRoleId]);

    res.status(201).json({ success: true, data: newRole[0][0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update Role
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    // Check if role exists
    const existing = await db.query(`SELECT * FROM roles WHERE id=?`, [id]);
    if (!existing[0].length) return res.status(404).json({ success: false, message: "Role not found" });

    // Update role
    const updatedRole = await db.query(
      `UPDATE roles SET 
         name = COALESCE(?, name),
         description = COALESCE(?, description),
         permissions = COALESCE(?, permissions),
         updated_at = NOW()
       WHERE id = ?`,
      [
        name,
        description,
        permissions ? JSON.stringify(permissions) : null,
        id
      ]
    );

    const role = await db.query(`SELECT * FROM roles WHERE id=?`, [id]);
    res.status(200).json({ success: true, data: role[0][0], message: "Role updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete Role
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if role exists
    const existing = await db.query(`SELECT * FROM roles WHERE id=?`, [id]);
    if (!existing[0].length) return res.status(404).json({ success: false, message: "Role not found" });

    const role = existing[0][0];

    // Check if role has users
    if (role.user_count > 0) {
      return res.status(400).json({ success: false, message: "Cannot delete role with assigned users" });
    }

    // Delete role
    await db.query(`DELETE FROM roles WHERE id=?`, [id]);
    res.status(200).json({ success: true, message: "Role deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
