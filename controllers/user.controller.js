import { db } from "../config/db.js";
import bcrypt from "bcryptjs";

// Get all users with pagination & filters
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (role) { params.push(role); conditions.push("role = ?"); }
    if (status) { params.push(status); conditions.push("status = ?"); }
    if (search) {
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
      conditions.push("(LOWER(username) LIKE ? OR LOWER(email) LIKE ?)");
    }

    const whereSQL = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    const [users] = await db.query(`
      SELECT id, username, email, role, status, phone, address_district, address_sector, address_cell, address_village, created_at
      FROM users ${whereSQL} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users ${whereSQL}`, params);

    res.json({ users, pagination: { current: parseInt(page), pages: Math.ceil(total / limit), total } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT id, username, email, role, status, phone, address_district, address_sector, address_cell, address_village, created_at
      FROM users WHERE id = ?`, [id]
    );

    if (!rows.length) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create new user
export const createUser = async (req, res) => {
  try {
    const { username, email, password, role = 'client', status = 'active', phone, address } = req.body;

    const [exists] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (exists.length) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await db.query(`
      INSERT INTO users (username, email, password, role, status, phone, address_district, address_sector, address_cell, address_village)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, role, status, phone, address?.district || null, address?.sector || null, address?.cell || null, address?.village || null]
    );

    const [newUser] = await db.query(`
      SELECT id, username, email, role, status, phone, address_district, address_sector, address_cell, address_village, created_at
      FROM users WHERE id = ?`, [result.insertId]
    );

    res.status(201).json(newUser[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, address, ...updateData } = req.body;

    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) { fields.push(`${key} = ?`); values.push(value); }

    if (password) { const hashed = await bcrypt.hash(password, 12); fields.push("password = ?"); values.push(hashed); }

    if (address) {
      if (address.district) { fields.push("address_district = ?"); values.push(address.district); }
      if (address.sector) { fields.push("address_sector = ?"); values.push(address.sector); }
      if (address.cell) { fields.push("address_cell = ?"); values.push(address.cell); }
      if (address.village) { fields.push("address_village = ?"); values.push(address.village); }
    }

    values.push(id);
    const [result] = await db.query(`UPDATE users SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`, values);

    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });

    const [updated] = await db.query(`
      SELECT id, username, email, role, status, phone, address_district, address_sector, address_cell, address_village, created_at
      FROM users WHERE id = ?`, [id]
    );

    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(`DELETE FROM users WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// User stats
export const getUserStats = async (req, res) => {
  try {
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users`);
    const [[{ recentUsers }]] = await db.query(`SELECT COUNT(*) AS recentUsers FROM users WHERE created_at >= NOW() - INTERVAL 7 DAY`);
    const [roleStats] = await db.query(`SELECT role, COUNT(*) AS count FROM users GROUP BY role`);
    const [statusStats] = await db.query(`SELECT status, COUNT(*) AS count FROM users GROUP BY status`);

    res.json({ total, recentUsers, roleStats, statusStats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
