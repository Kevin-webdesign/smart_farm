// import { db } from "../config/db.js";

// // ======================
// // CREATE input
// // ======================
// export const createInput = async (req, res) => {
//   const { name, amount, input_date, description } = req.body;
//   const userId = req.user.id;

//   try {
//     const [result] = await db.query(
//       `INSERT INTO inputs (name, amount, input_date, description, created_by)
//        VALUES (?, ?, ?, ?, ?)`,
//       [name, amount, input_date || new Date(), description, userId]
//     );

//     // Fetch inserted input
//     const [rows] = await db.query("SELECT * FROM inputs WHERE id = ?", [result.insertId]);
//     res.status(201).json({ success: true, input: rows[0] });
//   } catch (err) {
//     console.error("Error creating input:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // ======================
// // GET all inputs (admin sees all)
// // ======================
// export const getInputs = async (req, res) => {
//   const userRole = req.user.role;
//   const userId = req.user.id;

//   try {
//     const [rows] = await db.query(
//       userRole === "admin"
//         ? `SELECT * FROM inputs ORDER BY created_at DESC`
//         : `SELECT * FROM inputs WHERE created_by = ? ORDER BY created_at DESC`,
//       userRole === "admin" ? [] : [userId]
//     );

//     res.status(200).json({ success: true, inputs: rows });
//   } catch (err) {
//     console.error("Error fetching inputs:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // ======================
// // GET single input
// // ======================
// export const getInputById = async (req, res) => {
//   const { id } = req.params;
//   const userId = req.user.id;

//   try {
//     const [rows] = await db.query("SELECT * FROM inputs WHERE id = ?", [id]);
//     if (!rows.length) return res.status(404).json({ message: "Input not found" });

//     const input = rows[0];
//     if (input.created_by !== userId && req.user.role !== "admin")
//       return res.status(403).json({ message: "Access denied" });

//     res.status(200).json({ success: true, input });
//   } catch (err) {
//     console.error("Error fetching input:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // ======================
// // UPDATE input
// // ======================
// export const updateInput = async (req, res) => {
//   const { id } = req.params;
//   const updates = req.body;
//   const userId = req.user.id;

//   try {
//     const [existingRows] = await db.query("SELECT * FROM inputs WHERE id = ?", [id]);
//     if (!existingRows.length) return res.status(404).json({ message: "Input not found" });

//     const input = existingRows[0];
//     if (input.created_by !== userId && req.user.role !== "admin")
//       return res.status(403).json({ message: "Unauthorized" });

//     const setFields = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
//     const values = Object.values(updates);

//     await db.query(`UPDATE inputs SET ${setFields}, updated_at = NOW() WHERE id = ?`, [...values, id]);

//     const [updatedRows] = await db.query("SELECT * FROM inputs WHERE id = ?", [id]);
//     res.status(200).json({ success: true, input: updatedRows[0] });
//   } catch (err) {
//     console.error("Error updating input:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // ======================
// // DELETE input
// // ======================
// export const deleteInput = async (req, res) => {
//   const { id } = req.params;
//   const userId = req.user.id;

//   try {
//     const [existingRows] = await db.query("SELECT * FROM inputs WHERE id = ?", [id]);
//     if (!existingRows.length) return res.status(404).json({ message: "Input not found" });

//     const input = existingRows[0];
//     if (input.created_by !== userId && req.user.role !== "admin")
//       return res.status(403).json({ message: "Unauthorized" });

//     await db.query("DELETE FROM inputs WHERE id = ?", [id]);
//     res.status(200).json({ success: true, message: "Input deleted successfully" });
//   } catch (err) {
//     console.error("Error deleting input:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };


import { db } from "../config/db.js";

// Create input
export const createInput = async (req, res) => {
  const { name, amount, input_date, description } = req.body;
  const userId = req.user.id;

  try {
    const [result] = await db.query(`
      INSERT INTO inputs (name, amount, input_date, description, created_by)
      VALUES (?, ?, ?, ?, ?)`,
      [name, amount, input_date || new Date(), description, userId]
    );

    const [input] = await db.query(`SELECT * FROM inputs WHERE id = ?`, [result.insertId]);
    res.status(201).json({ success: true, input: input[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all inputs
export const getInputs = async (req, res) => {
  const { role, id: userId } = req.user;
  try {
    const [inputs] = await db.query(
      role === 'admin'
        ? `SELECT * FROM inputs ORDER BY created_at DESC`
        : `SELECT * FROM inputs WHERE created_by = ? ORDER BY created_at DESC`,
      role === 'admin' ? [] : [userId]
    );

    res.json({ success: true, inputs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single input
export const getInputById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const [rows] = await db.query(`SELECT * FROM inputs WHERE id = ?`, [id]);
    const input = rows[0];

    if (!input) return res.status(404).json({ message: "Input not found" });
    if (input.created_by !== userId && req.user.role !== 'admin') return res.status(403).json({ message: "Access denied" });

    res.json({ success: true, input });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update input
export const updateInput = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const userId = req.user.id;

  try {
    const [existing] = await db.query(`SELECT * FROM inputs WHERE id = ?`, [id]);
    if (!existing.length) return res.status(404).json({ message: "Input not found" });
    if (existing[0].created_by !== userId && req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });

    const fields = Object.keys(updates).map(k => `${k} = ?`).join(", ");
    const values = [...Object.values(updates), id];

    await db.query(`UPDATE inputs SET ${fields}, updated_at = NOW() WHERE id = ?`, values);

    const [updated] = await db.query(`SELECT * FROM inputs WHERE id = ?`, [id]);
    res.json({ success: true, input: updated[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete input
export const deleteInput = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const [existing] = await db.query(`SELECT * FROM inputs WHERE id = ?`, [id]);
    if (!existing.length) return res.status(404).json({ message: "Input not found" });
    if (existing[0].created_by !== userId && req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });

    await db.query(`DELETE FROM inputs WHERE id = ?`, [id]);
    res.json({ success: true, message: "Input deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};