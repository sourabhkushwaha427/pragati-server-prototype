const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getMonthlySummary } = require("../controllers/reportController");

// Apply authentication to all report routes
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Reporting and analytics APIs
 */

/**
 * @swagger
 * /api/reports/monthly-summary:
 *   get:
 *     summary: Get total sales and purchases for the last 5 months
 *     description: Returns monthly totals for sales and purchases grouped by month name.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly sales and purchase summary fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Monthly sales and purchase summary fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month_name:
 *                         type: string
 *                         example: "October 2025"
 *                       total_sales:
 *                         type: number
 *                         example: 70000.00
 *                       total_purchases:
 *                         type: number
 *                         example: 35000.00
 *       500:
 *         description: Server error fetching monthly summary
 */

router.get("/monthly-summary", getMonthlySummary);

module.exports = router;
