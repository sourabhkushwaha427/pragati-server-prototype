// controllers/reportController.js
const pool = require("../db"); // PostgreSQL connection pool

// Get total sales and purchases for last 5 months (with month name)
exports.getMonthlySummary = async (req, res) => {
  try {
    const query = `
      SELECT 
        TO_CHAR(invoice_date, 'Month') AS month_name,
        SUM(CASE WHEN p.type = 'customer' THEN i.total_amount ELSE 0 END) AS total_sales,
        SUM(CASE WHEN p.type = 'supplier' THEN i.total_amount ELSE 0 END) AS total_purchases
      FROM invoices i
      JOIN parties p ON i.party_id = p.id
      WHERE invoice_date >= (CURRENT_DATE - INTERVAL '5 months')
      GROUP BY TO_CHAR(invoice_date, 'Month'), DATE_TRUNC('month', invoice_date)
      ORDER BY DATE_TRUNC('month', invoice_date);
    `;

    const { rows } = await pool.query(query);

    res.status(200).json({
      success: true,
      message: "Monthly sales and purchase summary fetched successfully",
      data: rows,
    });
  } catch (error) {
    console.error("❌ Error fetching monthly summary:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching monthly summary",
    });
  }
};
