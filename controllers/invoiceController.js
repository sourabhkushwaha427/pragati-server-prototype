const pool = require('../db');

/**
 * Create a new invoice with multiple items
 */
const createInvoice = async (req, res) => {
  const client = await pool.connect();
  const { party_id, invoice_number, due_date, items, status } = req.body;
  const company_id = req.user.company_id;

  try {
    await client.query('BEGIN');

    // Step A: Insert into invoices (status optional)
    const invoiceResult = await client.query(
      `INSERT INTO invoices (company_id, party_id, invoice_number, due_date, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'draft')::invoice_status)
       RETURNING *`,
      [company_id, party_id, invoice_number, due_date, 0, status]
    );

    const invoiceId = invoiceResult.rows[0].id;
    let totalAmount = 0;

    // Step B: Loop through items
    for (let item of items) {
      const { item_id, quantity } = item;

      // === NAYA CHECK ADD KIYA HAI ===
      // DB Error (CHECK constraint) se bachne ke liye
      if (!quantity || quantity <= 0) {
        throw new Error(`Item quantity must be greater than 0 for item: ${item_id}`);
      }
      // ==================================

      const itemData = await client.query(
        `SELECT price, quantity as stock_quantity FROM items WHERE id=$1 AND company_id=$2`,
        [item_id, company_id]
      );

      if (itemData.rows.length === 0) {
        throw new Error(`Item not found: ${item_id}`);
      }

      if (itemData.rows[0].stock_quantity < quantity) {
        throw new Error(`Insufficient stock for item: ${item_id}`);
      }

      const priceAtPurchase = itemData.rows[0].price;
      const totalLineAmount = priceAtPurchase * quantity;
      totalAmount += totalLineAmount;

      await client.query(
        `INSERT INTO invoice_items (invoice_id, item_id, quantity, price_at_purchase, total_line_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [invoiceId, item_id, quantity, priceAtPurchase, totalLineAmount]
      );

      await client.query(
        `UPDATE items SET quantity = quantity - $1 WHERE id = $2`,
        [quantity, item_id]
      );
    }

    // Update total amount
    await client.query(
      `UPDATE invoices SET total_amount = $1 WHERE id = $2`,
      [totalAmount, invoiceId]
    );

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Invoice created successfully',
      invoice_id: invoiceId,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ error: err.message });
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
          i.due_date,
          i.total_amount,
          i.status,
          i.created_at,
          i.updated_at,
          p.name AS party_name
       FROM invoices i
       JOIN parties p ON i.party_id = p.id
       WHERE i.company_id = $1
       ORDER BY i.created_at DESC`,
      [company_id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching invoices' });
  }
};

/**
 * Get single invoice details with items
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

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const itemsResult = await pool.query(
      `SELECT ii.*, it.name AS item_name
       FROM invoice_items ii
       JOIN items it ON ii.item_id = it.id
       WHERE ii.invoice_id = $1`,
      [id]
    );

    res.status(200).json({
      ...invoiceResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching invoice details' });
  }
};


/**
 * Update invoice details (party_id, due_date, or status)
 */
const updateInvoice = async (req, res) => {
  const { id } = req.params;
  const { due_date, party_id, status, items } = req.body;
  const company_id = req.user.company_id;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Check if invoice exists
    const invoiceResult = await client.query(
      `SELECT * FROM invoices WHERE id = $1 AND company_id = $2`,
      [id, company_id]
    );
    if (invoiceResult.rows.length === 0) {
      throw new Error("Invoice not found");
    }

    // 2️⃣ Update invoice meta fields
    await client.query(
      `UPDATE invoices
       SET due_date = COALESCE($1, due_date),
           party_id = COALESCE($2, party_id),
           status = COALESCE($3, status)::invoice_status,
           updated_at = NOW()
       WHERE id = $4 AND company_id = $5`,
      [due_date, party_id, status, id, company_id]
    );

    // 3️⃣ Handle items update if provided
    if (Array.isArray(items)) {
      // Fetch existing invoice items
      const existingItems = await client.query(
        `SELECT item_id, quantity FROM invoice_items WHERE invoice_id = $1`,
        [id]
      );

      // Convert existing items to a map for quick lookup
      const existingMap = new Map(
        existingItems.rows.map((row) => [row.item_id, row.quantity])
      );

      let totalAmount = 0;

      // Loop through new items array
      for (const item of items) {
        const { item_id, quantity } = item;
        if (!quantity || quantity <= 0) {
          throw new Error(`Quantity must be greater than 0 for item ${item_id}`);
        }

        // Fetch item price and stock
        const itemData = await client.query(
          `SELECT price, quantity AS stock_quantity FROM items WHERE id = $1 AND company_id = $2`,
          [item_id, company_id]
        );
        if (itemData.rows.length === 0) {
          throw new Error(`Item not found: ${item_id}`);
        }

        const { price, stock_quantity } = itemData.rows[0];
        const existingQuantity = existingMap.get(item_id) || 0;
        const quantityChange = quantity - existingQuantity;

        // Check stock only if increasing quantity
        if (quantityChange > 0 && stock_quantity < quantityChange) {
          throw new Error(`Insufficient stock for item: ${item_id}`);
        }

        const totalLineAmount = price * quantity;
        totalAmount += totalLineAmount;

        // Update or insert item
        if (existingMap.has(item_id)) {
          await client.query(
            `UPDATE invoice_items
             SET quantity = $1, price_at_purchase = $2, total_line_amount = $3
             WHERE invoice_id = $4 AND item_id = $5`,
            [quantity, price, totalLineAmount, id, item_id]
          );
        } else {
          await client.query(
            `INSERT INTO invoice_items (invoice_id, item_id, quantity, price_at_purchase, total_line_amount)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, item_id, quantity, price, totalLineAmount]
          );
        }

        // Adjust stock
        await client.query(
          `UPDATE items SET quantity = quantity - $1 WHERE id = $2`,
          [quantityChange, item_id]
        );

        // Remove from existingMap (processed)
        existingMap.delete(item_id);
      }

      // 4️⃣ Handle removed items
      for (const [oldItemId, oldQty] of existingMap.entries()) {
        await client.query(
          `DELETE FROM invoice_items WHERE invoice_id = $1 AND item_id = $2`,
          [id, oldItemId]
        );

        // Return stock
        await client.query(
          `UPDATE items SET quantity = quantity + $1 WHERE id = $2`,
          [oldQty, oldItemId]
        );
      }

      // 5️⃣ Update total amount
      await client.query(
        `UPDATE invoices SET total_amount = $1 WHERE id = $2`,
        [totalAmount, id]
      );
    }

    await client.query("COMMIT");
    res.status(200).json({ message: "Invoice updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error updating invoice:", err);
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
      `UPDATE invoices SET status = $1::invoice_status WHERE id = $2 AND company_id = $3 RETURNING *`, // <-- FIX 3 HERE
      [status, id, company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.status(200).json({
      message: `Invoice marked as '${status}'`,
      invoice: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error updating invoice status' });
  }
};
/**
 * Delete an invoice
 */
const deleteInvoice = async (req, res) => {
  const { id } = req.params;
  const company_id = req.user.company_id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const invoiceCheck = await client.query(
      `SELECT id FROM invoices WHERE id = $1 AND company_id = $2`,
      [id, company_id]
    );

    if (invoiceCheck.rows.length === 0) {
      throw new Error('Invoice not found');
    }

    await client.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [id]);
    await client.query(`DELETE FROM invoices WHERE id = $1`, [id]);

    await client.query('COMMIT');
    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};


const getInvoiceSummary = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    console.log("🧩 Company ID in summary API:", company_id);

    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_invoices,
        COALESCE(SUM(total_amount), 0) AS total_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) AS paid_amount,
        COUNT(CASE WHEN status != 'paid' AND due_date < NOW() THEN 1 END) AS overdue
      FROM invoices
      WHERE company_id = $1::uuid;
    `, [company_id]);

    const row = result.rows[0];

    res.status(200).json({
      success: true,
      message: "Invoice summary fetched successfully",
      data: {
        total_invoices: parseInt(row.total_invoices) || 0,
        total_amount: parseFloat(row.total_amount) || 0,
        paid_amount: parseFloat(row.paid_amount) || 0,
        overdue: parseInt(row.overdue) || 0
      }
    });
  } catch (err) {
    console.error("❌ Error fetching invoice summary:", err);
    res.status(500).json({ error: "Internal Server Error while fetching invoice summary" });
  }
};


module.exports = {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
   getInvoiceSummary
};
