const express = require('express');
const fs = require('fs');
const User = require('../models/User');
const Note = require('../models/Note');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware, roleMiddleware('admin'));

router.get('/users', async (_req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.status(200).json(users);
  } catch (error) {
    return next(error);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    if (String(req.user._id) === String(req.params.id)) {
      return res.status(400).json({ message: 'Admin cannot delete own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await Note.deleteMany({ userId: user._id });
    await user.deleteOne();
    return res.status(200).json({ message: 'User deleted' });
  } catch (error) {
    return next(error);
  }
});

router.patch('/users/:id/block', async (req, res, next) => {
  try {
    const { isBlocked } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot block an admin account' });
    }
    user.isBlocked = Boolean(isBlocked);
    await user.save();
    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
});

router.get('/notes', async (_req, res, next) => {
  try {
    const notes = await Note.find()
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 });
    return res.status(200).json(notes);
  } catch (error) {
    return next(error);
  }
});

router.patch('/notes/:id/visibility', async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    const nextHiddenState = Boolean(req.body?.isHidden);
    note.isHidden = nextHiddenState;
    note.hiddenBy = nextHiddenState ? 'admin' : null;
    await note.save();
    return res.status(200).json(note);
  } catch (error) {
    return next(error);
  }
});

router.delete('/notes/:id', async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    if (note.filePath && fs.existsSync(note.filePath)) {
      fs.unlinkSync(note.filePath);
    }
    await note.deleteOne();
    return res.status(200).json({ message: 'Note deleted by admin' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
