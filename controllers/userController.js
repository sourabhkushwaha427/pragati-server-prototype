const pool = require('../db');

const getUserDetails = async (req, res) => {
  try {
    // Get user id from the decoded JWT (authMiddleware adds req.user)
    const userId = req.user.id;

    const query = `
      SELECT 
        u.id AS user_id,
        u.email,
        u.created_at AS user_created_at,
        c.id AS company_id,
        c.name AS company_name,
        c.logo,
        c.address,
        c.gstin,
        c.contact_email,
        c.contact_phone
      FROM users u
      JOIN companies c ON u.company_id = c.id
      WHERE u.id = $1;
    `;

    const { rows } = await pool.query(query, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    res.status(200).json({
      id: user.user_id,
      email: user.email,
      created_at: user.user_created_at,
      company: {
        id: user.company_id,
        name: user.company_name,
        logo: user.logo,
        address: user.address,
        gstin: user.gstin,
        contact_email: user.contact_email,
        contact_phone: user.contact_phone,
      },
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getUserDetails };
