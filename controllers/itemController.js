const pool = require('../db');

// ✅ GET all items for logged-in user's company
const getAllItems = async (req, res) => {
  try {
    const { company_id } = req.user;

    const result = await pool.query(
      `SELECT id, company_id, name, description, category, price, quantity, created_at, updated_at 
       FROM items 
       WHERE company_id = $1 
       ORDER BY created_at DESC`,
      [company_id]
    );

    res.status(200).json({
      success: true,
      message: "Items fetched successfully",
      items: result.rows,
    });
  } catch (err) {
    console.error('❌ Error fetching items:', err.message);
    res.status(500).json({ success: false, message: 'Server error fetching items' });
  }
};

// ✅ CREATE new item
const createItem = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { name, description, price, quantity, category } = req.body;

    const result = await pool.query(
      `INSERT INTO items (company_id, name, description, price, quantity, category, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, company_id, name, description, category, price, quantity, created_at, updated_at`,
      [company_id, name, description, price, quantity, category]
    );

    res.status(201).json({
      success: true,
      message: "Item created successfully",
      item: result.rows[0],
    });
  } catch (err) {
    console.error('❌ Error creating item:', err.message);
    res.status(500).json({ success: false, message: 'Server error creating item' });
  }
};

// ✅ UPDATE item
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;
    const { name, description, price, quantity, category } = req.body;

    const result = await pool.query(
      `UPDATE items
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           quantity = COALESCE($4, quantity),
           category = COALESCE($5, category),
           updated_at = NOW()
       WHERE id = $6 AND company_id = $7
       RETURNING id, company_id, name, description, category, price, quantity, created_at, updated_at`,
      [name, description, price, quantity, category, id, company_id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ message: 'Item not found or unauthorized' });

    res.json({
      success: true,
      message: "Item updated successfully",
      item: result.rows[0],
    });
  } catch (err) {
    console.error('❌ Error updating item:', err.message);
    res.status(500).json({ success: false, message: 'Server error updating item' });
  }
};

// ✅ DELETE item
const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;

    const result = await pool.query(
      'DELETE FROM items WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, company_id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ message: 'Item not found or unauthorized' });

    res.json({
      success: true,
      message: 'Item deleted successfully',
    });
  } catch (err) {
    console.error('❌ Error deleting item:', err.message);
    res.status(500).json({ success: false, message: 'Server error deleting item' });
  }
};

// ✅ DASHBOARD SUMMARY API (inside same controller)
const getItemSummary = async (req, res) => {
  try {
    const { company_id } = req.user;

    const result = await pool.query(
      `
      SELECT 
        COUNT(*) AS total_items,
        COALESCE(SUM(quantity), 0) AS total_stock,
        COUNT(DISTINCT category) AS categories,
        COUNT(*) FILTER (WHERE quantity < 5) AS low_stock
      FROM items
      WHERE company_id = $1
      `,
      [company_id]
    );

    const summary = result.rows[0];

    res.status(200).json({
      success: true,
      message: "Dashboard summary fetched successfully",
      data: {
        total_items: parseInt(summary.total_items),
        total_stock: parseInt(summary.total_stock),
        categories: parseInt(summary.categories),
        low_stock: parseInt(summary.low_stock),
      },
    });
  } catch (err) {
    console.error('❌ Error fetching summary:', err.message);
    res.status(500).json({ success: false, message: 'Server error fetching summary' });
  }
};

module.exports = { 
  getAllItems, 
  createItem, 
  updateItem, 
  deleteItem, 
  getItemSummary  
};
