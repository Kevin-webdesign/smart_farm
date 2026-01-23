import { db } from "../config/db.js";

// ======================
// CREATE harvest
// ======================
export const createHarvestRecord = async (req, res) => {
  const { crop_plan_id, actual_yield, quality, market_price, storage_location, notes } = req.body;
  const userId = req.user.id;

  try {
    const [cropRes] = await db.query(
      "SELECT * FROM crop_plans WHERE id = ? AND created_by = ?",
      [crop_plan_id, userId]
    );
    if (!cropRes.length) return res.status(404).json({ message: "Crop plan not found or doesn't belong to you" });
    const cropPlan = cropRes[0];

    const totalRevenue = (actual_yield || 0) * (market_price || 0);

    const [result] = await db.query(
      `INSERT INTO harvests
       (crop_plan_id, crop_name, harvest_date, actual_yield, quality, market_price, total_revenue, storage_location, notes, created_by)
       VALUES (?, ?, CURRENT_DATE, ?, ?, ?, ?, ?, ?, ?)`,
      [crop_plan_id, cropPlan.crop_name, actual_yield, quality, market_price, totalRevenue, storage_location, notes, userId]
    );

    const [harvestRows] = await db.query("SELECT * FROM harvests WHERE id = ?", [result.insertId]);
    const harvest = harvestRows[0];

    await db.query(
      "UPDATE crop_plans SET status = 'harvested', expected_harvest_date = CURRENT_DATE WHERE id = ?",
      [crop_plan_id]
    );

    const [userRows] = await db.query("SELECT id, username, email, phone FROM users WHERE id = ?", [userId]);
    harvest.created_by = userRows[0];
    harvest.crop_plan = cropPlan;

    res.status(201).json({ success: true, message: "Harvest record created successfully", data: harvest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// GET my harvest records
// ======================
export const getMyHarvestRecords = async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const [countRows] = await db.query(
      "SELECT COUNT(*) AS total FROM harvests WHERE created_by = ?",
      [userId]
    );
    const totalRecords = parseInt(countRows[0].total);
    const totalPages = Math.ceil(totalRecords / limit);

    const [harvestRows] = await db.query(
      "SELECT * FROM harvests WHERE created_by = ? ORDER BY harvest_date DESC LIMIT ? OFFSET ?",
      [userId, limit, offset]
    );

    const harvests = await Promise.all(
      harvestRows.map(async (h) => {
        const [user] = await db.query("SELECT id, username, email, phone FROM users WHERE id = ?", [h.created_by]);
        const [cropPlan] = await db.query(
          "SELECT id, crop_name, variety, field_area, expected_yield FROM crop_plans WHERE id = ?",
          [h.crop_plan_id]
        );
        return { ...h, created_by: user[0], crop_plan: cropPlan[0] };
      })
    );

    res.status(200).json({
      success: true,
      meta: { page, limit, totalRecords, totalPages },
      data: harvests
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// GET all harvests (admin or user)
// ======================
export const getHarvestRecords = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const countQuery = role === "admin"
      ? "SELECT COUNT(*) AS total FROM harvests"
      : "SELECT COUNT(*) AS total FROM harvests WHERE created_by = ?";
    const [countRows] = await db.query(countQuery, role === "admin" ? [] : [userId]);
    const totalRecords = parseInt(countRows[0].total);
    const totalPages = Math.ceil(totalRecords / limit);

    const dataQuery = role === "admin"
      ? "SELECT * FROM harvests ORDER BY harvest_date DESC LIMIT ? OFFSET ?"
      : "SELECT * FROM harvests WHERE created_by = ? ORDER BY harvest_date DESC LIMIT ? OFFSET ?";
    const queryParams = role === "admin" ? [limit, offset] : [userId, limit, offset];

    const [harvestRows] = await db.query(dataQuery, queryParams);

    const harvests = await Promise.all(
      harvestRows.map(async (h) => {
        const [user] = await db.query("SELECT id, username, email, phone FROM users WHERE id = ?", [h.created_by]);
        const [cropPlan] = await db.query(
          "SELECT id, crop_name, variety, field_area, expected_yield FROM crop_plans WHERE id = ?",
          [h.crop_plan_id]
        );
        return { ...h, created_by: user[0], crop_plan: cropPlan[0] };
      })
    );

    res.status(200).json({
      success: true,
      meta: { page, limit, totalRecords, totalPages },
      data: harvests
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// GET single harvest
// ======================
export const getHarvestRecord = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const [rows] = await db.query("SELECT * FROM harvests WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ message: "Harvest record not found" });

    const harvest = rows[0];
    if (harvest.created_by !== userId && role !== "admin") return res.status(403).json({ message: "Unauthorized" });

    const [user] = await db.query("SELECT id, username, email, phone FROM users WHERE id = ?", [harvest.created_by]);
    const [cropPlan] = await db.query(
      "SELECT id, crop_name, variety, field_area, expected_yield FROM crop_plans WHERE id = ?",
      [harvest.crop_plan_id]
    );

    harvest.created_by = user[0];
    harvest.crop_plan = cropPlan[0];

    res.status(200).json({ success: true, data: harvest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// UPDATE harvest
// ======================
export const updateHarvestRecord = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const [existingRows] = await db.query("SELECT * FROM harvests WHERE id = ?", [id]);
    if (!existingRows.length) return res.status(404).json({ message: "Harvest record not found" });

    const harvest = existingRows[0];
    if (harvest.created_by !== userId && role !== "admin") return res.status(403).json({ message: "Unauthorized" });

    if (updates.actual_yield || updates.market_price) {
      const actual_yield = updates.actual_yield || harvest.actual_yield;
      const market_price = updates.market_price || harvest.market_price;
      updates.total_revenue = actual_yield * market_price;
    }

    const setFields = Object.keys(updates).map(k => `${k} = ?`).join(", ");
    const values = Object.values(updates);

    await db.query(`UPDATE harvests SET ${setFields}, updated_at = NOW() WHERE id = ?`, [...values, id]);

    const [updatedRows] = await db.query("SELECT * FROM harvests WHERE id = ?", [id]);
    const updatedHarvest = updatedRows[0];

    const [user] = await db.query("SELECT id, username, email, phone FROM users WHERE id = ?", [updatedHarvest.created_by]);
    const [cropPlan] = await db.query("SELECT id, crop_name, variety, field_area, expected_yield FROM crop_plans WHERE id = ?", [updatedHarvest.crop_plan_id]);

    updatedHarvest.created_by = user[0];
    updatedHarvest.crop_plan = cropPlan[0];

    res.status(200).json({ success: true, message: "Harvest record updated successfully", data: updatedHarvest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// DELETE harvest
// ======================
export const deleteHarvestRecord = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const [existingRows] = await db.query("SELECT * FROM harvests WHERE id = ?", [id]);
    if (!existingRows.length) return res.status(404).json({ message: "Harvest record not found" });

    const harvest = existingRows[0];
    if (harvest.created_by !== userId && role !== "admin") return res.status(403).json({ message: "Unauthorized" });

    await db.query("DELETE FROM harvests WHERE id = ?", [id]);
    await db.query("UPDATE crop_plans SET status = 'growing' WHERE id = ?", [harvest.crop_plan_id]);

    res.status(200).json({ success: true, message: "Harvest record deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// GET harvest stats
// ======================
export const getHarvestStats = async (req, res) => {
  const userId = req.user.id;

  try {
    const [totalRes] = await db.query(
      "SELECT COUNT(*) AS total_harvests, SUM(actual_yield) AS total_yield, SUM(total_revenue) AS total_revenue FROM harvests WHERE created_by = ?",
      [userId]
    );

    const totalHarvests = parseInt(totalRes[0].total_harvests) || 0;
    const totalYield = parseFloat(totalRes[0].total_yield) || 0;
    const totalRevenue = parseFloat(totalRes[0].total_revenue) || 0;

    const [qualityRes] = await db.query(
      "SELECT quality, COUNT(*) AS count FROM harvests WHERE created_by = ? GROUP BY quality",
      [userId]
    );

    res.status(200).json({
      success: true,
      data: { totalHarvests, totalYield, totalRevenue, qualityDistribution: qualityRes }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
