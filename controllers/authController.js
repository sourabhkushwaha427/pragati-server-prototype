const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, company_id: user.company_id },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Register new user + company
const register = async (req, res) => {
  const client = await pool.connect();

  try {
    const { company_name, company_email, email, password } = req.body;

    if (!company_name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    await client.query('BEGIN');

    // Step 1: Create a company
    const companyResult = await client.query(
      `INSERT INTO companies (name, contact_email) 
       VALUES ($1, $2) RETURNING id`,
      [company_name, company_email || null]
    );

    const companyId = companyResult.rows[0].id;

    // Step 2: Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Step 3: Create user
    const userResult = await client.query(
      `INSERT INTO users (company_id, email, password) 
       VALUES ($1, $2, $3) RETURNING id, company_id, email`,
      [companyId, email, hashedPassword]
    );

    await client.query('COMMIT');

    const token = generateToken(userResult.rows[0]);
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  } finally {
    client.release();
  }
};

// Login existing user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, company_id: user.company_id, email: user.email },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

module.exports = { register, login };
