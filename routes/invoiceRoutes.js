const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  getInvoiceSummary 
} = require('../controllers/invoiceController');

// Apply authentication middleware
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: APIs for managing invoices and their items
 */




/**
 * @swagger
 * /api/invoices/summary:
 *   get:
 *     summary: Get invoice summary for the logged-in company
 *     description: Returns total invoices, total amount, paid amount, and overdue count.
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invoice summary fetched successfully
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
 *                   example: "Invoice summary fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_invoices:
 *                       type: integer
 *                       example: 5
 *                     total_amount:
 *                       type: number
 *                       example: 225400
 *                     paid_amount:
 *                       type: number
 *                       example: 96200
 *                     overdue:
 *                       type: integer
 *                       example: 1
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       500:
 *         description: Server error
 */

router.get('/summary', getInvoiceSummary);


/**
 * @swagger
 * /api/invoices:
 *   post:
 *     summary: Create a new invoice with multiple items
 *     description: Creates an invoice with its associated items and updates stock quantities accordingly.
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               party_id:
 *                 type: string
 *                 description: UUID of the customer or supplier
 *                 example: "b7d8a9d1-0a56-4e3c-93a9-1b02c8d74df2"
 *               invoice_number:
 *                 type: string
 *                 description: Unique invoice number for this company
 *                 example: "INV-2025-001"
 *               due_date:
 *                 type: string
 *                 format: date
 *                 description: Due date for the invoice payment
 *                 example: "2025-11-30"
 *               status:
 *                 type: string
 *                 description: Optional status of the invoice (defaults to `draft` if not provided)
 *                 enum: [draft, sent, paid, cancelled]
 *                 example: "draft"
 *               items:
 *                 type: array
 *                 description: List of items to be included in the invoice
 *                 items:
 *                   type: object
 *                   properties:
 *                     item_id:
 *                       type: string
 *                       description: UUID of the item
 *                       example: "5d5d61b5-b2a3-49e2-97ce-8c8f41f647af"
 *                     quantity:
 *                       type: integer
 *                       description: Quantity of the item being sold
 *                       example: 3
 *             required:
 *               - party_id
 *               - invoice_number
 *               - items
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invoice created successfully"
 *                 invoice_id:
 *                   type: string
 *                   format: uuid
 *                   example: "f4a3a7b9-5b92-4f58-99ff-6f46b258d7d3"
 *       400:
 *         description: Invalid input data, insufficient stock, or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Insufficient stock for item: 5d5d61b5-b2a3-49e2-97ce-8c8f41f647af"
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       500:
 *         description: Internal server error
 */
router.post('/', createInvoice);

/**
 * @swagger
 * /api/invoices:
 *   get:
 *     summary: Get all invoices for the logged-in company
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invoices fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   invoice_number:
 *                     type: string
 *                   due_date:
 *                     type: string
 *                     format: date
 *                   total_amount:
 *                     type: number
 *                   status:
 *                     type: string
 *                     enum: [draft, sent, paid, cancelled]
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     description: Date when the invoice was created
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *                     description: Last updated date of the invoice
 *                   party_name:
 *                     type: string
 *       500:
 *         description: Internal server error
 */
router.get('/', getAllInvoices);

/**
 * @swagger
 * /api/invoices/{id}:
 *   get:
 *     summary: Get detailed information of a specific invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the invoice
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invoice details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 invoice_number:
 *                   type: string
 *                 due_date:
 *                   type: string
 *                   format: date
 *                 total_amount:
 *                   type: number
 *                 status:
 *                   type: string
 *                   enum: [draft, sent, paid, cancelled]
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   description: Date when the invoice was created
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *                   description: Last updated date of the invoice
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       item_id:
 *                         type: string
 *                         format: uuid
 *                       item_name:
 *                         type: string
 *                       quantity:
 *                         type: integer
 *                       price_at_purchase:
 *                         type: number
 *                       total_line_amount:
 *                         type: number
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', getInvoiceById);

/**
 * @swagger
 * /api/invoices/{id}:
 *   put:
 *     summary: Update an existing invoice (details and items)
 *     description: >
 *       Updates invoice details (like due date, party, status) and optionally updates the items array.  
 *       You can add new items, update existing item quantities, or remove items.  
 *       Stock quantities are automatically adjusted based on changes.
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the invoice to update
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               party_id:
 *                 type: string
 *                 description: Updated party UUID (optional)
 *                 example: "b7d8a9d1-0a56-4e3c-93a9-1b02c8d74df2"
 *               due_date:
 *                 type: string
 *                 format: date
 *                 description: Updated due date (optional)
 *                 example: "2025-12-10"
 *               status:
 *                 type: string
 *                 description: Updated invoice status (optional)
 *                 enum: [draft, sent, paid, cancelled]
 *                 example: "sent"
 *               items:
 *                 type: array
 *                 description: >
 *                   Optional array of updated invoice items.  
 *                   - Existing items will have their quantities updated.  
 *                   - New items will be added.  
 *                   - Items missing from this list will be removed.
 *                 items:
 *                   type: object
 *                   properties:
 *                     item_id:
 *                       type: string
 *                       description: UUID of the item
 *                       example: "5d5d61b5-b2a3-49e2-97ce-8c8f41f647af"
 *                     quantity:
 *                       type: integer
 *                       description: Updated quantity for the item
 *                       example: 5
 *             example:
 *               due_date: "2025-12-10"
 *               status: "sent"
 *               items:
 *                 - item_id: "5d5d61b5-b2a3-49e2-97ce-8c8f41f647af"
 *                   quantity: 5
 *                 - item_id: "e9c6f7d3-0a55-4a5e-9c44-b6c6a1d68a9f"
 *                   quantity: 2
 *     responses:
 *       200:
 *         description: Invoice updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invoice updated successfully"
 *       400:
 *         description: Invalid input, insufficient stock, or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Insufficient stock for item: 5d5d61b5-b2a3-49e2-97ce-8c8f41f647af"
 *       404:
 *         description: Invoice not found
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       500:
 *         description: Internal server error
 */
router.put('/:id', updateInvoice);

/**
 * @swagger
 * /api/invoices/{id}:
 *   delete:
 *     summary: Delete an invoice and its associated items
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the invoice
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invoice deleted successfully
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */



router.delete('/:id', deleteInvoice);




module.exports = router;
