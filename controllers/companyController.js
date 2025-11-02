const pool = require("../db");
const cloudinary = require("../config/cloudinary");

// ✅ GET Company details by ID
const getCompanyDetails = async (req, res) => {
  const { company_id } = req.params;
  console.log("📥 Received company_id:", company_id);

  try {
    const query = `
      SELECT id, name, address, gstin, contact_email, contact_phone, logo, created_at, updated_at
      FROM companies
      WHERE id = $1;
    `;

    const { rows } = await pool.query(query, [company_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.status(200).json({
      success: true,
      message: "Company details fetched successfully",
      company: rows[0],
    });
  } catch (error) {
    console.error("❌ Error fetching company details:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ UPDATE Company details (including logo upload)
const updateCompanyDetails = async (req, res) => {
  const {
    company_id,
    name,
    address,
    gstin,
    contact_email,
    contact_phone,
    logo, // base64 string here
  } = req.body;

  try {
    let logoUrl = null;

    // ✅ If base64 logo is provided, upload to Cloudinary
    if (logo && logo.startsWith("data:image")) {
      console.log("🖼️ Uploading logo to Cloudinary...");

      const uploadResult = await cloudinary.uploader.upload(logo, {
        folder: "company_logos",
      });

      logoUrl = uploadResult.secure_url;
      console.log("✅ Logo uploaded successfully:", logoUrl);
    }

    // ✅ Update company in database
    const query = `
      UPDATE companies
      SET
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        gstin = COALESCE($3, gstin),
        contact_email = COALESCE($4, contact_email),
        contact_phone = COALESCE($5, contact_phone),
        logo = COALESCE($6, logo),
        updated_at = NOW()
      WHERE id = $7
      RETURNING id, name, address, gstin, contact_email, contact_phone, logo;
    `;

    const values = [
      name || null,
      address || null,
      gstin || null,
      contact_email || null,
      contact_phone || null,
      logoUrl || null,
      company_id,
    ];

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.status(200).json({
      success: true,
      message: "Company details updated successfully",
      company: rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating company details:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getCompanyDetails, updateCompanyDetails };
