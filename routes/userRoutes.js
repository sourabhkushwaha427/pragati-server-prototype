const express = require('express');
const { getUserDetails } = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Protect routes with auth
router.use(authMiddleware);

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user details (using JWT token)
 *     description: Fetches details of the currently authenticated user and their associated company.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched user details
 *       401:
 *         description: Unauthorized or invalid token
 */
router.get('/me', getUserDetails);

module.exports = router;
