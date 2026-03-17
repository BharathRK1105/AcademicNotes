const express = require('express');
const fs = require('fs');
const User = require('../models/User');
const Note = require('../models/Note');
const AdminAction = require('../models/AdminAction');
const NoteReport = require('../models/NoteReport');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware, roleMiddleware('admin'));

const logAdminAction = async ({ adminId, actionType, targetType, targetId, targetLabel }) => {
  await AdminAction.create({
    adminId,
    actionType,
    targetType,
    targetId,
    targetLabel: targetLabel || '',
  });
};

router.get('/profile/insights', async (req, res, next) => {
  try {
    const [users, notes, recentActions, allActions, openReports] = await Promise.all([
      User.find(),
      Note.find(),
      AdminAction.find({ adminId: req.user._id }).sort({ createdAt: -1 }).limit(5),
      AdminAction.find({ adminId: req.user._id }),
      NoteReport.countDocuments({ status: 'open' }),
    ]);

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter((item) => !item.isBlocked).length,
      totalNotes: notes.length,
      hiddenNotes: notes.filter((item) => item.isHidden).length,
      blockedUsers: allActions.filter((item) => item.actionType === 'block_user').length,
      unblockedUsers: allActions.filter((item) => item.actionType === 'unblock_user').length,
      notesHiddenByAdmin: allActions.filter((item) => item.actionType === 'hide_note').length,
      notesUnhiddenByAdmin: allActions.filter((item) => item.actionType === 'unhide_note').length,
      deletionsDone: allActions.filter((item) => item.actionType === 'delete_note' || item.actionType === 'delete_user').length,
      reportedContent: openReports || 0,
    };

    return res.status(200).json({
      stats,
      recentActions,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/reports', async (req, res, next) => {
  try {
    const status = req.query?.status ? String(req.query.status) : '';
    const filter = status ? { status } : {};
    const reports = await NoteReport.find(filter)
      .populate({
        path: 'noteId',
        select: 'title subject semester fileName isHidden userId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('reportedBy', 'name email role')
      .sort({ createdAt: -1 });
    return res.status(200).json(reports);
  } catch (error) {
    return next(error);
  }
});

router.patch('/reports/:id/resolve', async (req, res, next) => {
  try {
    const action = String(req.body?.action || 'dismiss');
    const report = await NoteReport.findById(req.params.id).populate('noteId');
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    if (report.status !== 'open') {
      return res.status(400).json({ message: 'Report is already resolved' });
    }

    if (!['dismiss', 'hide', 'delete'].includes(action)) {
      return res.status(400).json({ message: 'Invalid report action' });
    }

    let actionTaken = 'none';
    if (action === 'hide' || action === 'delete') {
      const note = await Note.findById(report.noteId?._id || report.noteId);
      if (!note) {
        return res.status(404).json({ message: 'Reported note not found' });
      }

      if (action === 'hide') {
        note.isHidden = true;
        note.hiddenBy = 'admin';
        await note.save();
        actionTaken = 'hidden';
        await logAdminAction({
          adminId: req.user._id,
          actionType: 'hide_note',
          targetType: 'note',
          targetId: note._id,
          targetLabel: note.title,
        });
      }

      if (action === 'delete') {
        if (note.filePath && fs.existsSync(note.filePath)) {
          fs.unlinkSync(note.filePath);
        }
        await note.deleteOne();
        actionTaken = 'deleted';
        await logAdminAction({
          adminId: req.user._id,
          actionType: 'delete_note',
          targetType: 'note',
          targetId: note._id,
          targetLabel: note.title,
        });
      }
    }

    report.status = action === 'dismiss' ? 'dismissed' : 'resolved';
    report.actionTaken = actionTaken;
    report.resolvedAt = new Date();
    report.resolvedBy = req.user._id;
    await report.save();

    return res.status(200).json(report);
  } catch (error) {
    return next(error);
  }
});

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
    await logAdminAction({
      adminId: req.user._id,
      actionType: 'delete_user',
      targetType: 'user',
      targetId: user._id,
      targetLabel: user.name || user.email,
    });
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
    await logAdminAction({
      adminId: req.user._id,
      actionType: user.isBlocked ? 'block_user' : 'unblock_user',
      targetType: 'user',
      targetId: user._id,
      targetLabel: user.name || user.email,
    });
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
    await logAdminAction({
      adminId: req.user._id,
      actionType: nextHiddenState ? 'hide_note' : 'unhide_note',
      targetType: 'note',
      targetId: note._id,
      targetLabel: note.title,
    });
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
    await logAdminAction({
      adminId: req.user._id,
      actionType: 'delete_note',
      targetType: 'note',
      targetId: note._id,
      targetLabel: note.title,
    });
    return res.status(200).json({ message: 'Note deleted by admin' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
