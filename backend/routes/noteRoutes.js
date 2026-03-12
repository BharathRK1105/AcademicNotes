const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const Note = require('../models/Note');
const User = require('../models/User');
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
    cb(null, `${Date.now()}-${crypto.randomUUID()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    const mimeOk = allowedMimeTypes.includes(mime);
    const extOk = allowedExt.includes(ext);
    const mimeGenericOk = !mime || mime === 'application/octet-stream';
    if (!extOk || (!mimeOk && !mimeGenericOk)) {
      return cb(new Error('Only PDF, JPG, and JPEG files are allowed'));
    }
    return cb(null, true);
  },
});

router.use(authMiddleware);

const getTitleFromFileName = (fileName = '') => {
  const ext = path.extname(fileName);
  const base = String(fileName).replace(ext, '');
  return base.replace(/[_-]+/g, ' ').trim() || 'Untitled Note';
};

const computeFileHash = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });

const findDuplicateNote = async ({ uploadedHash, uploadedSize }) => {
  const exactHashDuplicate = await Note.findOne({ fileHash: uploadedHash }).populate('userId', 'name');
  if (exactHashDuplicate) {
    return exactHashDuplicate;
  }

  // Backward compatibility: old notes may not have fileHash stored yet.
  // For those, compare only same-size files to keep this bounded.
  const legacyCandidates = await Note.find({
    fileSize: uploadedSize,
    $or: [{ fileHash: { $exists: false } }, { fileHash: null }, { fileHash: '' }],
  }).populate('userId', 'name');

  for (const candidate of legacyCandidates) {
    if (!candidate.filePath || !fs.existsSync(candidate.filePath)) {
      continue;
    }

    const candidateHash = await computeFileHash(candidate.filePath);
    candidate.fileHash = candidateHash;
    await candidate.save();

    if (candidateHash === uploadedHash) {
      return candidate;
    }
  }

  return null;
};

const enrichNote = (noteDoc, currentUserId) => {
  const note = noteDoc.toObject ? noteDoc.toObject() : noteDoc;
  const ratings = Array.isArray(note.ratings) ? note.ratings : [];
  const savedBy = Array.isArray(note.savedBy) ? note.savedBy : [];
  const ratingsCount = ratings.length;
  const downloadCount = Number(note.downloadCount || 0);
  const averageRating =
    ratingsCount > 0 ? Number((ratings.reduce((sum, item) => sum + Number(item.value || 0), 0) / ratingsCount).toFixed(1)) : 0;
  const myRating = ratings.find((item) => String(item.userId) === String(currentUserId))?.value || null;
  const isSavedByMe = savedBy.some((item) => String(item) === String(currentUserId));
  const savedCount = savedBy.length;

  // Trust Score: combines quality + confidence + engagement + saves with small moderation penalty.
  const qualityScore = (averageRating / 5) * 40;
  const confidenceScore = (Math.min(ratingsCount, 20) / 20) * 20;
  const engagementScore = (Math.min(downloadCount, 200) / 200) * 20;
  const saveScore = (Math.min(savedCount, 50) / 50) * 20;
  const hiddenPenalty = note.isHidden ? (note.hiddenBy === 'admin' ? 20 : 8) : 0;
  const trustScore = Math.max(0, Math.min(100, Math.round(qualityScore + confidenceScore + engagementScore + saveScore - hiddenPenalty)));
  const trustTier = trustScore >= 80 ? 'High' : trustScore >= 50 ? 'Medium' : 'Low';
  return {
    ...note,
    ratingsCount,
    averageRating,
    myRating,
    isSavedByMe,
    savedCount,
    trustScore,
    trustTier,
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
    const fileHash = await computeFileHash(filePath);
    const duplicateNote = await findDuplicateNote({
      uploadedHash: fileHash,
      uploadedSize: req.file.size,
    });
    if (duplicateNote) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(409).json({
        message: `File already uploaded by ${duplicateNote.userId?.name || 'another user'}.`,
      });
    }

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
      fileHash,
    });

    return res.status(201).json(note);
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return next(error);
  }
});

router.post('/bulk', upload.array('files', 10), async (req, res, next) => {
  try {
    if (!['student', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only students and admins can upload notes' });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      return res.status(400).json({ message: 'At least one file is required' });
    }

    const description = req.body?.description ? String(req.body.description).trim() : '';
    const subject = req.body?.subject ? String(req.body.subject).trim() : '';
    const semester = req.body?.semester ? String(req.body.semester).trim() : '';
    const bulkTitleInput = req.body?.bulkTitle ? String(req.body.bulkTitle).trim() : '';
    const bulkGroupId = files.length > 1 ? crypto.randomUUID() : '';
    const bulkTitle = bulkGroupId ? bulkTitleInput || 'Bulk Upload Pack' : '';
    let titles = [];
    try {
      titles = req.body?.titles ? JSON.parse(req.body.titles) : [];
    } catch (_error) {
      titles = [];
    }

    const created = [];
    const failed = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const filePath = file.path.replace(/\\/g, '/');
      const fileUrl = `/uploads/${file.filename}`;

      try {
        const fileHash = await computeFileHash(filePath);
        const duplicateNote = await findDuplicateNote({
          uploadedHash: fileHash,
          uploadedSize: file.size,
        });
        if (duplicateNote) {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          failed.push({
            fileName: file.originalname,
            reason: `File already uploaded by ${duplicateNote.userId?.name || 'another user'}.`,
          });
          continue;
        }

        const customTitle = Array.isArray(titles) ? String(titles[index] || '').trim() : '';
        const noteTitle = customTitle || getTitleFromFileName(file.originalname);

        const note = await Note.create({
          userId: req.user._id,
          title: noteTitle,
          description,
          subject,
          semester,
          fileName: file.originalname,
          filePath,
          fileUrl,
          fileType: file.mimetype,
          fileSize: file.size,
          fileHash,
          bulkGroupId,
          bulkTitle,
          bulkItemOrder: index + 1,
        });
        created.push({
          id: note._id,
          fileName: file.originalname,
          title: note.title,
        });
      } catch (error) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        failed.push({
          fileName: file.originalname,
          reason: error?.message || 'Upload failed',
        });
      }
    }

    return res.status(200).json({
      message: `Bulk upload complete. Uploaded: ${created.length}, Failed: ${failed.length}.`,
      uploadedCount: created.length,
      failedCount: failed.length,
      created,
      failed,
    });
  } catch (error) {
    if (Array.isArray(req.files)) {
      for (const file of req.files) {
        if (file?.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }
    return next(error);
  }
});

router.get('/feed', async (req, res, next) => {
  try {
    const notes = await Note.find({
      $or: [{ isHidden: { $ne: true } }, { userId: req.user._id, hiddenBy: 'owner' }],
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

router.get('/saved/me', async (req, res, next) => {
  try {
    const notes = await Note.find({
      savedBy: req.user._id,
      $or: [{ isHidden: { $ne: true } }, { userId: req.user._id, hiddenBy: 'owner' }],
    })
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 });
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

    note.downloadCount = Number(note.downloadCount || 0) + 1;
    await note.save();

    const user = await User.findById(req.user._id);
    if (user) {
      user.lastDownloadedAt = new Date();
      user.lastDownloadedNoteTitle = note.title;
      await user.save();
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
      note.ratings[existingIndex].ratedAt = new Date();
    } else {
      note.ratings.push({ userId: req.user._id, value: ratingValue, ratedAt: new Date() });
    }

    const updated = await note.save();
    return res.status(200).json(enrichNote(updated, req.user._id));
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/save', async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    const alreadySaved = (note.savedBy || []).some((item) => String(item) === String(req.user._id));
    if (alreadySaved) {
      note.savedBy = (note.savedBy || []).filter((item) => String(item) !== String(req.user._id));
    } else {
      note.savedBy = [...(note.savedBy || []), req.user._id];
    }
    const updated = await note.save();
    return res.status(200).json(enrichNote(updated, req.user._id));
  } catch (error) {
    return next(error);
  }
});

router.get('/activity/me', async (req, res, next) => {
  try {
    const [myNotes, ratedNotes, me] = await Promise.all([
      Note.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(5),
      Note.find({ 'ratings.userId': req.user._id }),
      User.findById(req.user._id),
    ]);

    const lastRating = ratedNotes
      .flatMap((note) =>
        (note.ratings || [])
          .filter((rating) => String(rating.userId) === String(req.user._id))
          .map((rating) => ({
            noteId: note._id,
            noteTitle: note.title,
            value: rating.value,
            ratedAt: rating.ratedAt || note.updatedAt || note.createdAt,
          }))
      )
      .sort((a, b) => new Date(b.ratedAt) - new Date(a.ratedAt))[0] || null;

    return res.status(200).json({
      lastUploads: myNotes.map((item) => ({
        id: item._id,
        title: item.title,
        createdAt: item.createdAt,
      })),
      lastRating,
      lastDownload: me?.lastDownloadedAt
        ? {
            noteTitle: me.lastDownloadedNoteTitle || 'Unknown',
            downloadedAt: me.lastDownloadedAt,
          }
        : null,
    });
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
