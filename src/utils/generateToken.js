const jwt = require('jsonwebtoken');

/**
 * Signs and returns a JWT containing the user's MongoDB _id and role.
 * @param {string} userId - MongoDB ObjectId as string
 * @param {string} role - User role (e.g., 'admin', 'clinician')
 * @returns {string} Signed JWT
 */
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = generateToken;
