const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getAllParties, createParty, updateParty, deleteParty, getPartySummary } = require('../controllers/partyController');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Parties
 *   description: Customer/Supplier management APIs
 */

/**
 * @swagger
 * /api/parties:
 *   get:
 *     summary: Get all parties for the logged-in company
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of parties
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   company_id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [customer, supplier]
 *                   contact_email:
 *                     type: string
 *                   contact_phone:
 *                     type: string
 *                   billing_address:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 */

/**
 * @swagger
 * /api/parties:
 *   post:
 *     summary: Create a new party
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Acme Corp"
 *               type:
 *                 type: string
 *                 enum: [customer, supplier]
 *                 example: "customer"
 *               contact_email:
 *                 type: string
 *                 example: "contact@acme.com"
 *               contact_phone:
 *                 type: string
 *                 example: "+911234567890"
 *               billing_address:
 *                 type: string
 *                 example: "123 Main St, City, Country"
 *     responses:
 *       201:
 *         description: Party created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Party'
 *       500:
 *         description: Server error creating party
 */

/**
 * @swagger
 * /api/parties/{id}:
 *   put:
 *     summary: Update an existing party
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Party ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [customer, supplier]
 *               contact_email:
 *                 type: string
 *               contact_phone:
 *                 type: string
 *               billing_address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Party updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Party'
 *       404:
 *         description: Party not found or unauthorized
 *       500:
 *         description: Server error updating party
 */

/**
 * @swagger
 * /api/parties/{id}:
 *   delete:
 *     summary: Delete a party
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Party ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Party deleted successfully
 *       404:
 *         description: Party not found or unauthorized
 *       500:
 *         description: Server error deleting party
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Party:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         company_id:
 *           type: string
 *         name:
 *           type: string
 *         type:
 *           type: string
 *           enum: [customer, supplier]
 *         contact_email:
 *           type: string
 *         contact_phone:
 *           type: string
 *         billing_address:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/parties/summary:
 *   get:
 *     summary: Get summary of all parties for the logged-in company
 *     description: Returns total number of parties, customers, and suppliers.
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Party summary fetched successfully
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
 *                   example: "Party summary fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_parties:
 *                       type: integer
 *                       example: 5
 *                     customers:
 *                       type: integer
 *                       example: 3
 *                     suppliers:
 *                       type: integer
 *                       example: 2
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       500:
 *         description: Server error
 */


router.get('/summary', getPartySummary);
router.get('/', getAllParties);
router.post('/', createParty);
router.put('/:id', updateParty);
router.delete('/:id', deleteParty);

module.exports = router;
