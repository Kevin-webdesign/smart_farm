import { db } from "../config/db.js";

// ======================
// CREATE Crop Plan
// ======================
export const createCropPlan = async (req, res) => {
  const {
    crop_name,
    variety,
    field_area,
    planting_date,
    expected_harvest_date,
    expected_yield,
    cost,
    notes,
  } = req.body;
  const userId = req.user.id;

  try {
    const [result] = await db.query(
      `INSERT INTO crop_plans
       (crop_name, variety, field_area, planting_date, expected_harvest_date, expected_yield, cost, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [crop_name, variety, field_area, planting_date, expected_harvest_date, expected_yield, cost || 0, notes, userId]
    );

    const cropId = result.insertId;

    const [userRes] = await db.query(
      "SELECT id, username, email, role, phone, address_district, address_sector, address_cell, address_village FROM users WHERE id=?",
      [userId]
    );

    const crop = {
      id: cropId,
      crop_name,
      variety,
      field_area,
      planting_date,
      expected_harvest_date,
      expected_yield,
      cost: cost || 0,
      notes,
      created_by: userRes[0],
    };

    res.status(201).json({
      success: true,
      message: "Crop plan created successfully",
      data: crop,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// GET all Crop Plans
// ======================
export const getCropPlans = async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await db.query(
        "SELECT * FROM crop_plans WHERE created_by=? ORDER BY created_at DESC",
       [userId]
    );

    const crops = await Promise.all(
      rows.map(async (crop) => {
        const [userRes] = await db.query(
          "SELECT id, username, email, role, phone, address_district, address_sector, address_cell, address_village FROM users WHERE id=?",
          [crop.created_by]
        );
        crop.created_by = userRes[0];
        return crop;
      })
    );

    res.status(200).json({ success: true, data: crops });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// GET  all Crop Plans by staff
// ======================
export const getAllCropPlans = async (req, res) => {

  try {
    const [rows] = await db.query(
      "SELECT * FROM crop_plans ORDER BY created_at DESC"
    );

    const crops = await Promise.all(
      rows.map(async (crop) => {
        const [userRes] = await db.query(
          "SELECT id, username, email, role, phone, address_district, address_sector, address_cell, address_village FROM users WHERE id=?",
          [crop.created_by]
        );
        crop.created_by = userRes[0];
        return crop;
      })
    );

    res.status(200).json({ success: true, data: crops });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// ======================
// GET single Crop Plan
// ======================
export const getCropPlan = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query("SELECT * FROM crop_plans WHERE id=?", [id]);
    const crop = rows[0];
    if (!crop) return res.status(404).json({ message: "Crop plan not found" });

    const [userRes] = await db.query(
      "SELECT id, username, email, role, phone, address_district, address_sector, address_cell, address_village FROM users WHERE id=?",
      [crop.created_by]
    );
    crop.created_by = userRes[0];

    res.status(200).json({ success: true, data: crop });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// UPDATE Crop Plan
// ======================
export const updateCropPlan = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const userId = req.user.id;

  try {
    const [existingRows] = await db.query("SELECT * FROM crop_plans WHERE id=?", [id]);
    if (!existingRows.length) return res.status(404).json({ message: "Crop plan not found" });

    if (existingRows[0].created_by !== userId && req.user.role !== "admin")
      return res.status(403).json({ message: "Unauthorized" });

    const fields = Object.keys(updates).map((k) => `${k}=?`).join(", ");
    const values = Object.values(updates);

    await db.query(`UPDATE crop_plans SET ${fields}, updated_at=NOW() WHERE id=?`, [...values, id]);

    const [updatedRows] = await db.query("SELECT * FROM crop_plans WHERE id=?", [id]);
    const [userRes] = await db.query(
      "SELECT id, username, email, role, phone, address_district, address_sector, address_cell, address_village FROM users WHERE id=?",
      [updatedRows[0].created_by]
    );
    updatedRows[0].created_by = userRes[0];

    res.status(200).json({ success: true, message: "Crop plan updated successfully", data: updatedRows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// DELETE Crop Plan
// ======================
export const deleteCropPlan = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const [existingRows] = await db.query("SELECT * FROM crop_plans WHERE id=?", [id]);
    if (!existingRows.length) return res.status(404).json({ message: "Crop plan not found" });

    if (existingRows[0].created_by !== userId && req.user.role !== "admin")
      return res.status(403).json({ message: "Unauthorized" });

    await db.query("DELETE FROM crop_plans WHERE id=?", [id]);

    res.status(200).json({ success: true, message: "Crop plan deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};