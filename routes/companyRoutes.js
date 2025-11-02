const express = require("express");
const { getCompanyDetails, updateCompanyDetails } = require("../controllers/companyController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// Protect all routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/companies/{company_id}:
 *   get:
 *     summary: Get company details by ID
 *     tags: [Companies]
 *     parameters:
 *       - name: company_id
 *         in: path
 *         required: true
 *         description: UUID of the company
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company details fetched successfully
 *       404:
 *         description: Company not found
 */
router.get("/:company_id", getCompanyDetails);

/**
 * @swagger
 * /api/companies/update:
 *   put:
 *     summary: Update company details (including base64 logo)
 *     tags: [Companies]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company_id:
 *                 type: string
 *                 example: "b0f0a8b8-8f4b-4a6e-a28c-45e7e1c8d9a1"
 *               name:
 *                 type: string
 *                 example: "Techverse"
 *               address:
 *                 type: string
 *                 example: "Indore, MP, India"
 *               gstin:
 *                 type: string
 *                 example: "22AAAAA0000A1Z5"
 *               contact_email:
 *                 type: string
 *                 example: "info@techverse.com"
 *               contact_phone:
 *                 type: string
 *                 example: "+91 9999999999"
 *               logo:
 *                 type: string
 *                 example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA..."
 */
router.put("/update", updateCompanyDetails);

module.exports = router;
