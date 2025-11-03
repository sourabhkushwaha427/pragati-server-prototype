const pool = require('../db');

/**
 * Dashboard stats (Monthly Overview)
 * Returns previous & current month metrics
 */
const getDashboardStats = async (req, res) => {
  const company_id = req.user.company_id; // Assuming authentication middleware adds user object

  try {
    const query = `
      SELECT json_build_object(
          -- Total Revenue (Sum of total_amount from invoices)
          'previous_month_total_revenue', COALESCE(SUM(CASE WHEN date_trunc('month', invoice_date) = date_trunc('month', CURRENT_DATE) - interval '1 month' AND company_id = $1 THEN total_amount END), 0),
          'current_month_total_revenue', COALESCE(SUM(CASE WHEN date_trunc('month', invoice_date) = date_trunc('month', CURRENT_DATE) AND company_id = $1 THEN total_amount END), 0),

          -- Total Customers (New customers created each month)
          'previous_month_total_customers', COALESCE((SELECT COUNT(*) FROM parties 
              WHERE type = 'customer' 
              AND company_id = $1
              AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE) - interval '1 month'), 0),
          'current_month_total_customers', COALESCE((SELECT COUNT(*) FROM parties 
              WHERE type = 'customer' 
              AND company_id = $1
              AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)), 0),

          -- Total Sales (Count of paid invoices)
          'previous_month_total_sales', COALESCE(SUM(CASE WHEN date_trunc('month', invoice_date) = date_trunc('month', CURRENT_DATE) - interval '1 month' AND status = 'paid' AND company_id = $1 THEN 1 END), 0),
          'current_month_total_sales', COALESCE(SUM(CASE WHEN date_trunc('month', invoice_date) = date_trunc('month', CURRENT_DATE) AND status = 'paid' AND company_id = $1 THEN 1 END), 0),

          -- Total Products Sold (Sum of quantity from invoice_items)
          'previous_month_total_products_sold', COALESCE((
              SELECT SUM(ii.quantity)
              FROM invoice_items ii
              JOIN invoices inv ON ii.invoice_id = inv.id
              WHERE inv.status = 'paid'
              AND inv.company_id = $1
              AND date_trunc('month', inv.invoice_date) = date_trunc('month', CURRENT_DATE) - interval '1 month'
          ), 0),
          'current_month_total_products_sold', COALESCE((
              SELECT SUM(ii.quantity)
              FROM invoice_items ii
              JOIN invoices inv ON ii.invoice_id = inv.id
              WHERE inv.status = 'paid'
              AND inv.company_id = $1
              AND date_trunc('month', inv.invoice_date) = date_trunc('month', CURRENT_DATE)
          ), 0)
      ) AS monthly_stats
      FROM invoices;
    `;

    const result = await pool.query(query, [company_id]);

    res.status(200).json(result.rows[0].monthly_stats);
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/dashboard/revenue-overview
const getRevenueOverview = async (req, res) => {
  try {
    const company_id = req.user.company_id; // from auth middleware

    const query = `SELECT json_agg(
         json_build_object(
           'monthName', TO_CHAR(month, 'FMMonth'),
           'value', total_revenue
         ) ORDER BY month
       ) AS revenue_overview
FROM (
    SELECT 
        date_trunc('month', invoice_date) AS month,
        COALESCE(SUM(total_amount), 0) AS total_revenue
    FROM invoices
    WHERE company_id = $1
      AND invoice_date >= date_trunc('month', CURRENT_DATE) - interval '5 month'
      AND invoice_date <= CURRENT_DATE
    GROUP BY date_trunc('month', invoice_date)
    ORDER BY month
) AS monthly_data;`;

    const { rows } = await pool.query(query, [company_id]);
    const result = rows[0]?.revenue_overview || {};

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching revenue overview:', error);
    res.status(500).json({ message: 'Server error fetching revenue overview' });
  }
};



const getSalesDistribution = async (req, res) => {
  try {
    const company_id = req.user.company_id; // ✅ Ensure company scoping

    const result = await pool.query(`
      SELECT 
        i.category,
        SUM(ii.total_line_amount) AS total_amount
      FROM invoice_items ii
      JOIN items i ON ii.item_id = i.id
      JOIN invoices inv ON inv.id = ii.invoice_id
      WHERE inv.status = 'paid'
        AND inv.company_id = $1  -- ✅ filter by company
      GROUP BY i.category
      ORDER BY total_amount DESC;
    `, [company_id]);

    if (result.rows.length === 0) {
      return res.status(200).json({ sales_distribution: [] });
    }

    const grandTotal = result.rows.reduce(
      (sum, row) => sum + Number(row.total_amount),
      0
    );

    const sales_distribution = result.rows.map((row) => ({
      category: row.category,
      amount: Number(row.total_amount),
      percentage: parseFloat(((row.total_amount / grandTotal) * 100).toFixed(2))
    }));

    res.status(200).json({ sales_distribution });
  } catch (error) {
    console.error("Error fetching sales distribution:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


/**
 * @desc Get Top 5 Best-Selling Products for the Current Month
 * @route GET /api/dashboard/top-products
 * @access Private
 */
const getTopProducts = async (req, res) => {
  try {
    const company_id = req.user.company_id; // from auth middleware

    const query = `
      SELECT 
        i.name AS product_name,
        SUM(ii.quantity) AS units_sold,
        SUM(ii.total_line_amount) AS total_revenue
      FROM invoice_items ii
      JOIN invoices inv ON ii.invoice_id = inv.id
      JOIN items i ON ii.item_id = i.id
      WHERE inv.status = 'paid'
        AND inv.company_id = $1
        AND date_trunc('month', inv.invoice_date) = date_trunc('month', CURRENT_DATE)
      GROUP BY i.name
      ORDER BY units_sold DESC
      LIMIT 5;
    `;

    const { rows } = await pool.query(query, [company_id]);

    res.status(200).json({
      top_products: rows.map((row, index) => ({
        rank: index + 1,
        product_name: row.product_name,
        units_sold: Number(row.units_sold),
        total_revenue: Number(row.total_revenue),
      })),
    });
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { getDashboardStats, getRevenueOverview, getSalesDistribution, getTopProducts, };
