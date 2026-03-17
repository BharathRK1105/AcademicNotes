const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const googleClient = new OAuth2Client();

const getGoogleAudiences = () => {
  const many = (process.env.GOOGLE_CLIENT_IDS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (many.length > 0) {
    return many;
  }
  if (process.env.GOOGLE_CLIENT_ID) {
    return [process.env.GOOGLE_CLIENT_ID.trim()];
  }
  return [];
};

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  username: user.username,
  role: user.role,
  authProvider: user.authProvider,
  createdAt: user.createdAt,
  department: user.department || '',
  semester: user.semester || '',
  bio: user.bio || '',
  interests: Array.isArray(user.interests) ? user.interests : [],
  lastLoginAt: user.lastLoginAt || null,
  lastDownloadedAt: user.lastDownloadedAt || null,
  lastDownloadedNoteTitle: user.lastDownloadedNoteTitle || '',
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const buildBaseUsernameFromEmail = (email) => {
  const localPart = String(email || '')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
  return localPart || 'student';
};

const generateUniqueUsername = async (email) => {
  const base = buildBaseUsernameFromEmail(email);
  let candidate = base;
  let counter = 0;

  while (counter < 1000) {
    const exists = await User.exists({ username: candidate });
    if (!exists) {
      return candidate;
    }
    counter += 1;
    candidate = `${base}${counter}`;
  }

  return `${base}${Date.now()}`;
};

router.post('/admin/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const admin = await User.findOne({
      username: String(username).trim().toLowerCase(),
      role: 'admin',
      authProvider: 'local',
    }).select('+password');

    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }
    if (admin.isBlocked) {
      return res.status(403).json({ message: 'Admin account is blocked' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const token = signToken(admin._id);
    return res.status(200).json({
      token,
      user: sanitizeUser(admin),
      role: admin.role,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/google', async (req, res, next) => {
  try {
    const audiences = getGoogleAudiences();
    if (audiences.length === 0) {
      return res.status(500).json({ message: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS is not configured' });
    }

    const { idToken, accessToken } = req.body;
    if (!idToken && !accessToken) {
      return res.status(400).json({ message: 'Google idToken or accessToken is required' });
    }

    let payload = null;

    if (idToken) {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: audiences,
      });
      payload = ticket.getPayload();
    } else {
      const tokenInfo = await googleClient.getTokenInfo(accessToken);
      if (!tokenInfo || !tokenInfo.aud || !audiences.includes(tokenInfo.aud)) {
        return res.status(401).json({ message: 'Invalid Google access token audience' });
      }
      payload = {
        sub: tokenInfo.sub || tokenInfo.user_id,
        email: tokenInfo.email,
        name: tokenInfo.email ? tokenInfo.email.split('@')[0] : undefined,
      };
    }

    if (!payload || !payload.email || !payload.sub) {
      return res.status(401).json({ message: 'Invalid Google token payload' });
    }

    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }],
    });

    if (user && user.role === 'admin') {
      return res.status(403).json({ message: 'Admins must login with username/password' });
    }

    if (!user) {
      user = await User.create({
        name: payload.name || payload.email.split('@')[0],
        email: payload.email.toLowerCase(),
        googleId: payload.sub,
        authProvider: 'google',
        role: 'student',
        lastLoginAt: new Date(),
      });
    } else {
      let changed = false;
      if (user.authProvider !== 'google') {
        user.authProvider = 'google';
        changed = true;
      }
      if (!user.googleId) {
        user.googleId = payload.sub;
        changed = true;
      }
      if (user.isBlocked) {
        return res.status(403).json({ message: 'User is blocked by admin' });
      }
      user.lastLoginAt = new Date();
      changed = true;
      if (changed) {
        await user.save();
      }
    }

    const token = signToken(user._id);
    return res.status(200).json({
      token,
      user: sanitizeUser(user),
      role: user.role,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const username = await generateUniqueUsername(email);

    const user = await User.create({
      name,
      username,
      email,
      password,
      authProvider: 'local',
      role: 'student',
      isBlocked: false,
      lastLoginAt: new Date(),
    });

    const token = signToken(user._id);
    return res.status(201).json({
      token,
      user: sanitizeUser(user),
      role: user.role,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const usernameOrEmail = String(req.body?.usernameOrEmail || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: 'Username/email and password are required' });
    }

    const query = usernameOrEmail.includes('@')
      ? { email: usernameOrEmail }
      : { username: usernameOrEmail };

    const user = await User.findOne(query).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'Account not found. Please register first.' });
    }
    if (user.authProvider !== 'local') {
      return res.status(401).json({ message: 'This account uses Google sign-in' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admins must login with username/password in Admin mode' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'User is blocked by admin' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user._id);
    return res.status(200).json({
      token,
      user: sanitizeUser(user),
      role: user.role,
    });
  } catch (error) {
    return next(error);
  }
});


router.get('/me', authMiddleware, async (req, res) => {
  res.status(200).json({
    user: sanitizeUser(req.user),
    role: req.user.role,
  });
});

router.patch('/me', authMiddleware, async (req, res, next) => {
  try {
    const { name, department, semester, bio, interests } = req.body || {};
    const user = req.user;

    if (typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }
    if (typeof department === 'string') {
      user.department = department.trim();
    }
    if (typeof semester === 'string') {
      user.semester = semester.trim();
    }
    if (typeof bio === 'string') {
      user.bio = bio.trim().slice(0, 300);
    }
    if (Array.isArray(interests)) {
      user.interests = interests
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .slice(0, 10);
    }

    await user.save();
    return res.status(200).json({
      user: sanitizeUser(user),
      role: user.role,
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/change-password', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.authProvider !== 'local') {
      return res.status(400).json({ message: 'Password change is only available for local accounts' });
    }

    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
