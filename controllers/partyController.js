const pool = require('../db');

// ✅ GET all parties
const getAllParties = async (req, res) => {
  try {
    const { company_id } = req.user;
    const result = await pool.query(
      'SELECT * FROM parties WHERE company_id = $1 ORDER BY created_at DESC',
      [company_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching parties:', err.message);
    res.status(500).json({ message: 'Server error fetching parties' });
  }
};

// ✅ CREATE party
const createParty = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { name, type, contact_email, contact_phone, billing_address } = req.body;

    const result = await pool.query(
      `INSERT INTO parties (company_id, name, type, contact_email, contact_phone, billing_address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [company_id, name, type, contact_email, contact_phone, billing_address]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating party:', err.message);
    res.status(500).json({ message: 'Server error creating party' });
  }
};

// ✅ UPDATE party
const updateParty = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;
    const { name, type, contact_email, contact_phone, billing_address } = req.body;

    const result = await pool.query(
      `UPDATE parties
       SET name = $1, type = $2, contact_email = $3, contact_phone = $4, billing_address = $5, updated_at = NOW()
       WHERE id = $6 AND company_id = $7
       RETURNING *`,
      [name, type, contact_email, contact_phone, billing_address, id, company_id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ message: 'Party not found or unauthorized' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating party:', err.message);
    res.status(500).json({ message: 'Server error updating party' });
  }
};

// ✅ DELETE party
const deleteParty = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;

    const result = await pool.query(
      'DELETE FROM parties WHERE id = $1 AND company_id = $2 RETURNING *',
      [id, company_id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ message: 'Party not found or unauthorized' });

    res.json({ message: 'Party deleted successfully' });
  } catch (err) {
    console.error('Error deleting party:', err.message);
    res.status(500).json({ message: 'Server error deleting party' });
  }
};

// ✅ GET party summary (counts)
const getPartySummary = async (req, res) => {
  try {
    const { company_id } = req.user;

    const totalPartiesQuery = `
      SELECT COUNT(*) AS total_parties,
             SUM(CASE WHEN type = 'customer' THEN 1 ELSE 0 END) AS customers,
             SUM(CASE WHEN type = 'supplier' THEN 1 ELSE 0 END) AS suppliers
      FROM parties
      WHERE company_id = $1;
    `;

    const result = await pool.query(totalPartiesQuery, [company_id]);

    res.json({
      success: true,
      message: 'Party summary fetched successfully',
      data: {
        total_parties: parseInt(result.rows[0].total_parties) || 0,
        customers: parseInt(result.rows[0].customers) || 0,
        suppliers: parseInt(result.rows[0].suppliers) || 0,
      },
    });
  } catch (err) {
    console.error('Error fetching party summary:', err.message);
    res.status(500).json({ message: 'Server error fetching party summary' });
  }
};

module.exports = { getAllParties, createParty, updateParty, deleteParty,  getPartySummary  };
