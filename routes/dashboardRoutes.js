const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getDashboardStats, getRevenueOverview, getSalesDistribution, getTopProducts } = require('../controllers/dashBoardController');

// Apply authentication middleware globally for all routes
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard analytics APIs
 */

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get monthly dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 previous_month_total_revenue:
 *                   type: number
 *                   example: 1000
 *                 current_month_total_revenue:
 *                   type: number
 *                   example: 2000
 *                 previous_month_total_customers:
 *                   type: integer
 *                   example: 300
 *                 current_month_total_customers:
 *                   type: integer
 *                   example: 900
 *                 previous_month_total_sales:
 *                   type: integer
 *                   example: 90
 *                 current_month_total_sales:
 *                   type: integer
 *                   example: 800
 *                 previous_month_total_products_sold:
 *                   type: integer
 *                   example: 800
 *                 current_month_total_products_sold:
 *                   type: integer
 *                   example: 900
 *       500:
 *         description: Server error fetching dashboard stats
 */
router.get('/stats', getDashboardStats);

/**
 * @swagger
 * /api/dashboard/revenue-overview:
 *   get:
 *     summary: Get total revenue for the last 6 months
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue overview fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 may_total_revenue: 15000
 *                 june_total_revenue: 32000
 *                 july_total_revenue: 41000
 *                 august_total_revenue: 55000
 *                 september_total_revenue: 49000
 *                 october_total_revenue: 62000
 *       500:
 *         description: Server error fetching revenue overview
 */
router.get('/revenue-overview', getRevenueOverview);



/**
 * @swagger
 * /api/dashboard/sales-distribution:
 *   get:
 *     summary: Get sales distribution by category
 *     description: Returns the total sales amount and percentage share for each product category based on paid invoices.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales distribution fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sales_distribution:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                         example: Electronics
 *                       amount:
 *                         type: number
 *                         example: 85988
 *                       percentage:
 *                         type: number
 *                         format: float
 *                         example: 35.0
 *             example:
 *               sales_distribution:
 *                 - category: Electronics
 *                   amount: 85988
 *                   percentage: 35
 *                 - category: Furniture
 *                   amount: 61420
 *                   percentage: 25
 *                 - category: Clothing
 *                   amount: 49136
 *                   percentage: 20
 *                 - category: Food & Beverage
 *                   amount: 36852
 *                   percentage: 15
 *                 - category: Others
 *                   amount: 12284
 *                   percentage: 5
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Internal server error
 */
router.get('/sales-distribution', getSalesDistribution);

/**
 * @swagger
 * /api/dashboard/top-products:
 *   get:
 *     summary: Get top 5 best-selling products of the current month
 *     description: Returns the top 5 products with the highest sales (units sold) for the current month.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top products fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               top_products:
 *                 - rank: 1
 *                   product_name: Premium Widget
 *                   units_sold: 245
 *                   total_revenue: 98000
 *                 - rank: 2
 *                   product_name: Standard Package
 *                   units_sold: 189
 *                   total_revenue: 75600
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/top-products', getTopProducts);




module.exports = router;
