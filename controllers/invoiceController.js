// controllers/invoiceController.js
const pool = require('../db');

/**
 * Create a new invoice with multiple items (multi-tenant safe)
 */
const createInvoice = async (req, res) => {
  const client = await pool.connect();
  const { party_id, invoice_number, due_date, items = [], status } = req.body;
  const company_id = req.user.company_id;

  try {
    await client.query('BEGIN');

    // 0) Validate party belongs to company
    const partyCheck = await client.query(
      `SELECT 1 FROM parties WHERE id = $1 AND company_id = $2`,
      [party_id, company_id]
    );
    if (partyCheck.rowCount === 0) {
      throw new Error('Party not found for this company');
    }

    // 0.1) Optional: ensure invoice_number uniqueness per company (DB already enforces it)
    // but this provides a clearer error message
    const invNumCheck = await client.query(
      `SELECT 1 FROM invoices WHERE company_id = $1 AND invoice_number = $2`,
      [company_id, invoice_number]
    );
    if (invNumCheck.rowCount > 0) {
      throw new Error('Invoice number already exists for this company');
    }

    // Step A: Insert invoice (status optional)
    const invoiceResult = await client.query(
      `INSERT INTO invoices (company_id, party_id, invoice_number, due_date, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'draft')::invoice_status)
       RETURNING *`,
      [company_id, party_id, invoice_number, due_date || null, 0, status]
    );

    const invoiceId = invoiceResult.rows[0].id;
    let totalAmount = 0;

    // Step B: Loop through items (if any)
    for (const item of items) {
      const { item_id, quantity } = item;

      if (!item_id) throw new Error('Item ID is required for each item line');
      if (!quantity || quantity <= 0) {
        throw new Error(`Item quantity must be greater than 0 for item: ${item_id}`);
      }

      // Fetch item (only from this company)
      const itemData = await client.query(
        `SELECT price, quantity AS stock_quantity
           FROM items
          WHERE id = $1 AND company_id = $2`,
        [item_id, company_id]
      );
      if (itemData.rowCount === 0) {
        throw new Error(`Item not found for this company: ${item_id}`);
      }

      const { price: priceAtPurchase, stock_quantity } = itemData.rows[0];

      if (stock_quantity < quantity) {
        throw new Error(`Insufficient stock for item: ${item_id}`);
      }

      const totalLineAmount = Number(priceAtPurchase) * Number(quantity);
      totalAmount += totalLineAmount;

      await client.query(
        `INSERT INTO invoice_items (invoice_id, item_id, quantity, price_at_purchase, total_line_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [invoiceId, item_id, quantity, priceAtPurchase, totalLineAmount]
      );

      // Decrement stock WITH company scope
      await client.query(
        `UPDATE items
            SET quantity = quantity - $1
          WHERE id = $2 AND company_id = $3`,
        [quantity, item_id, company_id]
      );
    }

    // Update total amount on invoice
    await client.query(
      `UPDATE invoices SET total_amount = $1 WHERE id = $2 AND company_id = $3`,
      [totalAmount, invoiceId, company_id]
    );

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Invoice created successfully',
      invoice_id: invoiceId,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ createInvoice error:', err);
    // Unique violation hint
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Duplicate invoice number for this company' });
    }
    res.status(400).json({ error: err.message || 'Failed to create invoice' });
  } finally {
    client.release();
  }
};

/**
 * Get all invoices for the logged-in company
 */
const getAllInvoices = async (req, res) => {
  const company_id = req.user.company_id;

  try {
    const result = await pool.query(
      `SELECT 
          i.id,
          i.invoice_number,
          i.invoice_date,
          i.due_date,
          i.total_amount,
          i.status,
          i.created_at,
          i.updated_at,
          p.name AS party_name
       FROM invoices i
       JOIN parties p
         ON i.party_id = p.id
        AND p.company_id = i.company_id              -- 🔒 ensure party is same company
       WHERE i.company_id = $1
       ORDER BY i.created_at DESC`,
      [company_id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('❌ getAllInvoices error:', err);
    res.status(500).json({ error: 'Error fetching invoices' });
  }
};

/**
 * Get single invoice details with items (scoped to company)
 */
const getInvoiceById = async (req, res) => {
  const { id } = req.params;
  const company_id = req.user.company_id;

  try {
    const invoiceResult = await pool.query(
      `SELECT 
          id, 
          company_id, 
          party_id, 
          invoice_number, 
          invoice_date, 
          due_date, 
          total_amount, 
          status,
          created_at,
          updated_at
       FROM invoices 
       WHERE id = $1 AND company_id = $2`,
      [id, company_id]
    );

    if (invoiceResult.rowCount === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const itemsResult = await pool.query(
      `SELECT
          ii.id,
          ii.item_id,
          ii.quantity,
          ii.price_at_purchase,
          ii.total_line_amount,
          it.name AS item_name,
          it.category
       FROM invoice_items ii
       JOIN items it
         ON ii.item_id = it.id
       JOIN invoices inv
         ON ii.invoice_id = inv.id
      WHERE ii.invoice_id = $1
        AND inv.company_id = $2`,      // 🔒 scope items to the same company via invoices
      [id, company_id]
    );

    res.status(200).json({
      ...invoiceResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    console.error('❌ getInvoiceById error:', err);
    res.status(500).json({ error: 'Error fetching invoice details' });
  }
};

/**
 * Update invoice details (party_id, due_date, status, items) — multi-tenant safe
 */
const updateInvoice = async (req, res) => {
  const { id } = req.params;
  const { due_date, party_id, status, items } = req.body;
  const company_id = req.user.company_id;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1) Ensure invoice belongs to company
    const invoiceResult = await client.query(
      `SELECT * FROM invoices WHERE id = $1 AND company_id = $2`,
      [id, company_id]
    );
    if (invoiceResult.rowCount === 0) {
      throw new Error('Invoice not found');
    }

    // 1.1) If party change requested, ensure party belongs to this company
    if (party_id) {
      const partyCheck = await client.query(
        `SELECT 1 FROM parties WHERE id = $1 AND company_id = $2`,
        [party_id, company_id]
      );
      if (partyCheck.rowCount === 0) {
        throw new Error('Party not found for this company');
      }
    }

    // 2) Update invoice meta
    await client.query(
      `UPDATE invoices
          SET due_date = COALESCE($1, due_date),
              party_id = COALESCE($2, party_id),
              status   = COALESCE($3, status)::invoice_status,
              updated_at = NOW()
        WHERE id = $4 AND company_id = $5`,
      [due_date || null, party_id || null, status || null, id, company_id]
    );

    // 3) Update items if provided
    if (Array.isArray(items)) {
      // Fetch existing invoice items
      const existingItems = await client.query(
        `SELECT item_id, quantity FROM invoice_items WHERE invoice_id = $1`,
        [id]
      );

      const existingMap = new Map(
        existingItems.rows.map((row) => [row.item_id, row.quantity])
      );

      let totalAmount = 0;

      for (const item of items) {
        const { item_id, quantity } = item;

        if (!item_id) throw new Error('Item ID is required for each item line');
        if (!quantity || quantity <= 0) {
          throw new Error(`Quantity must be greater than 0 for item ${item_id}`);
        }

        // Fetch item price & stock (scoped)
        const itemData = await client.query(
          `SELECT price, quantity AS stock_quantity
             FROM items
            WHERE id = $1 AND company_id = $2`,
          [item_id, company_id]
        );
        if (itemData.rowCount === 0) {
          throw new Error(`Item not found for this company: ${item_id}`);
        }

        const { price, stock_quantity } = itemData.rows[0];
        const prevQty = existingMap.get(item_id) || 0;
        const quantityChange = Number(quantity) - Number(prevQty);

        // If increasing qty, ensure stock available
        if (quantityChange > 0 && stock_quantity < quantityChange) {
          throw new Error(`Insufficient stock for item: ${item_id}`);
        }

        const totalLineAmount = Number(price) * Number(quantity);
        totalAmount += totalLineAmount;

        if (existingMap.has(item_id)) {
          // update line
          await client.query(
            `UPDATE invoice_items
                SET quantity = $1,
                    price_at_purchase = $2,
                    total_line_amount = $3
              WHERE invoice_id = $4 AND item_id = $5`,
            [quantity, price, totalLineAmount, id, item_id]
          );
        } else {
          // insert new line
          await client.query(
            `INSERT INTO invoice_items (invoice_id, item_id, quantity, price_at_purchase, total_line_amount)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, item_id, quantity, price, totalLineAmount]
          );
        }

        // Adjust stock WITH company scope (quantityChange can be negative -> adds stock)
        await client.query(
          `UPDATE items
              SET quantity = quantity - $1
            WHERE id = $2 AND company_id = $3`,
          [quantityChange, item_id, company_id]
        );

        // mark this item as processed
        existingMap.delete(item_id);
      }

      // Items that were removed in the new payload -> delete and return stock
      for (const [oldItemId, oldQty] of existingMap.entries()) {
        await client.query(
          `DELETE FROM invoice_items WHERE invoice_id = $1 AND item_id = $2`,
          [id, oldItemId]
        );

        await client.query(
          `UPDATE items
              SET quantity = quantity + $1
            WHERE id = $2 AND company_id = $3`,
          [oldQty, oldItemId, company_id]
        );
      }

      // Recompute total from DB to be 100% accurate (optional but robust)
      const sumRes = await client.query(
        `SELECT COALESCE(SUM(total_line_amount), 0) AS total
           FROM invoice_items
          WHERE invoice_id = $1`,
        [id]
      );
      const finalTotal = Number(sumRes.rows[0].total) || 0;

      await client.query(
        `UPDATE invoices SET total_amount = $1 WHERE id = $2 AND company_id = $3`,
        [finalTotal, id, company_id]
      );
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Invoice updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ updateInvoice error:', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
};

/**
 * Update only the invoice status
 */
const updateInvoiceStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const company_id = req.user.company_id;

  const validStatuses = ['draft', 'sent', 'paid', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const result = await pool.query(
      `UPDATE invoices
          SET status = $1::invoice_status,
              updated_at = NOW()
        WHERE id = $2 AND company_id = $3
        RETURNING *`,
      [status, id, company_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.status(200).json({
      message: `Invoice marked as '${status}'`,
      invoice: result.rows[0],
    });
  } catch (err) {
    console.error('❌ updateInvoiceStatus error:', err);
    res.status(500).json({ error: 'Error updating invoice status' });
  }
};

/**
 * Delete an invoice (and its items) safely for this company
 */
const deleteInvoice = async (req, res) => {
  const { id } = req.params;
  const company_id = req.user.company_id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check ownership
    const invoiceCheck = await client.query(
      `SELECT id FROM invoices WHERE id = $1 AND company_id = $2`,
      [id, company_id]
    );
    if (invoiceCheck.rowCount === 0) {
      throw new Error('Invoice not found');
    }

    // Return stock to items before deleting lines
    const lines = await client.query(
      `SELECT item_id, quantity
         FROM invoice_items
        WHERE invoice_id = $1`,
      [id]
    );
    for (const line of lines.rows) {
      await client.query(
        `UPDATE items
            SET quantity = quantity + $1
          WHERE id = $2 AND company_id = $3`,
        [line.quantity, line.item_id, company_id]
      );
    }

    // Delete invoice_items with company scoping via USING
    await client.query(
      `DELETE FROM invoice_items ii
        USING invoices inv
       WHERE ii.invoice_id = inv.id
         AND inv.id = $1
         AND inv.company_id = $2`,
      [id, company_id]
    );

    // Delete invoice
    await client.query(
      `DELETE FROM invoices WHERE id = $1 AND company_id = $2`,
      [id, company_id]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ deleteInvoice error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

/**
 * Summary KPIs for invoices (scoped)
 */
const getInvoiceSummary = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const result = await pool.query(
      `
      SELECT
        COUNT(*) AS total_invoices,
        COALESCE(SUM(total_amount), 0) AS total_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) AS paid_amount,
        COUNT(CASE WHEN status != 'paid' AND due_date < NOW() THEN 1 END) AS overdue
      FROM invoices
      WHERE company_id = $1::uuid;
      `,
      [company_id]
    );

    const row = result.rows[0];

    res.status(200).json({
      success: true,
      message: 'Invoice summary fetched successfully',
      data: {
        total_invoices: parseInt(row.total_invoices, 10) || 0,
        total_amount: parseFloat(row.total_amount) || 0,
        paid_amount: parseFloat(row.paid_amount) || 0,
        overdue: parseInt(row.overdue, 10) || 0,
      },
    });
  } catch (err) {
    console.error('❌ getInvoiceSummary error:', err);
    res
      .status(500)
      .json({ error: 'Internal Server Error while fetching invoice summary' });
  }
};

module.exports = {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  getInvoiceSummary,
};
