const notFound = (req, res, _next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

const errorHandler = (err, _req, res, _next) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  if (err && err.code === 11000) {
    const duplicateField =
      (err.keyPattern && Object.keys(err.keyPattern)[0]) ||
      (err.keyValue && Object.keys(err.keyValue)[0]) ||
      '';
    if (duplicateField === 'email') {
      return res.status(409).json({ message: 'Email already exists' });
    }
    if (duplicateField === 'username') {
      return res.status(409).json({ message: 'Username already exists' });
    }
    if (duplicateField === 'googleId') {
      return res.status(409).json({ message: 'Google account already linked to another user' });
    }
    return res.status(409).json({ message: 'Duplicate value already exists' });
  }
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Max size is 10MB' });
  }
  if (err && err.message && err.message.includes('Only PDF, JPG, and JPEG files are allowed')) {
    return res.status(400).json({ message: err.message });
  }
  return res.status(statusCode).json({
    message: err.message || 'Internal server error',
  });
};

module.exports = {
  notFound,
  errorHandler,
};
