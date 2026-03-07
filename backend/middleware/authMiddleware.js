const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const hasBearer = authHeader.startsWith('Bearer ');
    const queryToken = req.query?.token ? String(req.query.token) : '';
    if (!hasBearer && !queryToken) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }

    const token = hasBearer ? authHeader.split(' ')[1] : queryToken;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Invalid token user' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'User is blocked by admin' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
