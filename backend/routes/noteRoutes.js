const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Note = require('../models/Note');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
const allowedExt = ['.pdf', '.jpg', '.jpeg'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mimeOk = allowedMimeTypes.includes((file.mimetype || '').toLowerCase());
    const extOk = allowedExt.includes(ext);
    if (!mimeOk || !extOk) {
      return cb(new Error('Only PDF, JPG, and JPEG files are allowed'));
    }
    return cb(null, true);
  },
});

router.use(authMiddleware);

const enrichNote = (noteDoc, currentUserId) => {
  const note = noteDoc.toObject ? noteDoc.toObject() : noteDoc;
  const ratings = Array.isArray(note.ratings) ? note.ratings : [];
  const ratingsCount = ratings.length;
  const averageRating =
    ratingsCount > 0 ? Number((ratings.reduce((sum, item) => sum + Number(item.value || 0), 0) / ratingsCount).toFixed(1)) : 0;
  const myRating = ratings.find((item) => String(item.userId) === String(currentUserId))?.value || null;
  return {
    ...note,
    ratingsCount,
    averageRating,
    myRating,
    canOwnerUnhide: !(note.isHidden && note.hiddenBy === 'admin' && String(note.userId) === String(currentUserId)),
  };
};

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!['student', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only students and admins can upload notes' });
    }

    const { title, description, subject, semester } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const filePath = req.file.path.replace(/\\/g, '/');
    const fileUrl = `/uploads/${req.file.filename}`;

    const note = await Note.create({
      userId: req.user._id,
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      subject: subject ? String(subject).trim() : '',
      semester: semester ? String(semester).trim() : '',
      fileName: req.file.originalname,
      filePath,
      fileUrl,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });

    return res.status(201).json(note);
  } catch (error) {
    return next(error);
  }
});

router.get('/feed', async (req, res, next) => {
  try {
    const notes = await Note.find({
      isHidden: { $ne: true },
    })
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 });
    return res.status(200).json(notes.map((item) => enrichNote(item, req.user._id)));
  } catch (error) {
    return next(error);
  }
});

router.get('/mine', async (req, res, next) => {
  try {
    const notes = await Note.find({
      userId: req.user._id,
      $or: [{ isHidden: { $ne: true } }, { hiddenBy: 'owner' }],
    }).sort({ createdAt: -1 });
    return res.status(200).json(notes.map((item) => enrichNote(item, req.user._id)));
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/download', async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    const isOwner = String(note.userId) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (note.isHidden && !isAdmin && (!isOwner || note.hiddenBy === 'admin')) {
      return res.status(403).json({ message: 'This note is hidden and cannot be downloaded' });
    }

    if (!note.filePath || !fs.existsSync(note.filePath)) {
      return res.status(404).json({ message: 'Note file not found on server' });
    }

    return res.download(note.filePath, note.fileName);
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { title, description, subject, semester } = req.body;
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    if (String(note.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed to edit this note' });
    }

    note.title = title ? String(title).trim() : note.title;
    note.description = typeof description === 'string' ? description.trim() : note.description;
    note.subject = typeof subject === 'string' ? subject.trim() : note.subject;
    note.semester = typeof semester === 'string' ? semester.trim() : note.semester;
    const updated = await note.save();
    return res.status(200).json(enrichNote(updated, req.user._id));
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/visibility', async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    if (String(note.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed to hide/unhide this note' });
    }

    const nextHiddenState = Boolean(req.body?.isHidden);
    if (!nextHiddenState && note.isHidden && note.hiddenBy === 'admin') {
      return res.status(403).json({ message: 'This note was hidden by admin and cannot be unhidden by student' });
    }
    note.isHidden = nextHiddenState;
    note.hiddenBy = nextHiddenState ? 'owner' : null;
    const updated = await note.save();
    return res.status(200).json(enrichNote(updated, req.user._id));
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/rate', async (req, res, next) => {
  try {
    const ratingValue = Number(req.body?.value);
    if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({ message: 'Rating value must be between 1 and 5' });
    }

    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    if (note.isHidden) {
      return res.status(403).json({ message: 'Hidden note cannot be rated' });
    }

    const existingIndex = note.ratings.findIndex((item) => String(item.userId) === String(req.user._id));
    if (existingIndex >= 0) {
      note.ratings[existingIndex].value = ratingValue;
    } else {
      note.ratings.push({ userId: req.user._id, value: ratingValue });
    }

    const updated = await note.save();
    return res.status(200).json(enrichNote(updated, req.user._id));
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    if (String(note.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed to delete this note' });
    }

    if (note.filePath && fs.existsSync(note.filePath)) {
      fs.unlinkSync(note.filePath);
    }
    await note.deleteOne();
    return res.status(200).json({ message: 'Note deleted' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
