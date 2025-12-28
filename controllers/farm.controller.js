import { db } from "../config/db.js";

// ======================
// CREATE transaction
// ======================
export const createTransaction = async (req, res) => {
  const userId = req.user.id;
  const { date, crop_activity, type, amount, payment_method, description } = req.body;

  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  try {
    const [result] = await db.query(
      `INSERT INTO farm_transactions
      (date, crop_activity, type, amount, payment_method, description, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [date, crop_activity, type, amount, payment_method, description, userId]
    );

    // Get the inserted transaction
    const [transactionRows] = await db.query(
      "SELECT * FROM farm_transactions WHERE id = ?",
      [result.insertId]
    );
    const transaction = transactionRows[0];

    // Populate createdBy info
    const [userRows] = await db.query(
      "SELECT id, username, email, phone, role, address, district, sector, cell, village, status FROM users WHERE id = ?",
      [userId]
    );
    transaction.created_by = userRows[0];

    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// ======================
// GET all transactions for current user
// ======================
export const getAllTransactions = async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await db.query(
      "SELECT * FROM farm_transactions WHERE created_by = ? ORDER BY date DESC",
      [userId]
    );
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ======================
// GET public transactions (all users, with creator info)
// ======================
export const getPublicTransactions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ft.*, u.id AS user_id, u.username, u.email, u.phone, u.role, u.address, u.district, u.sector, u.cell, u.village, u.status
       FROM farm_transactions ft
       JOIN users u ON ft.created_by = u.id
       ORDER BY ft.date DESC`
    );

    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ======================
// GET transaction by ID (owner only)
// ======================
export const getTransactionById = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      "SELECT * FROM farm_transactions WHERE id = ? AND created_by = ?",
      [id, userId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Transaction not found' });

    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ======================
// UPDATE transaction
// ======================
export const updateTransaction = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const updates = req.body;

  try {
    const [existingRows] = await db.query(
      "SELECT * FROM farm_transactions WHERE id = ? AND created_by = ?",
      [id, userId]
    );
    if (!existingRows.length) return res.status(404).json({ error: 'Transaction not found' });

    const fields = Object.keys(updates).map(k => `${k} = ?`).join(", ");
    const values = Object.values(updates);

    await db.query(
      `UPDATE farm_transactions SET ${fields}, updated_at = NOW() WHERE id = ? AND created_by = ?`,
      [...values, id, userId]
    );

    const [updatedRows] = await db.query(
      "SELECT * FROM farm_transactions WHERE id = ?",
      [id]
    );
    res.status(200).json({ success: true, data: updatedRows[0] });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// ======================
// DELETE transaction
// ======================
export const deleteTransaction = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const [existingRows] = await db.query(
      "SELECT * FROM farm_transactions WHERE id = ? AND created_by = ?",
      [id, userId]
    );
    if (!existingRows.length) return res.status(404).json({ error: 'Transaction not found' });

    await db.query(
      "DELETE FROM farm_transactions WHERE id = ? AND created_by = ?",
      [id, userId]
    );
    res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
