const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: function requireEmail() {
        return this.authProvider === 'google';
      },
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: function requirePassword() {
        return this.authProvider === 'local';
      },
      minlength: 6,
      select: false,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'google',
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    semester: {
      type: String,
      trim: true,
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      default: '',
      maxlength: 300,
    },
    interests: [
      {
        type: String,
        trim: true,
      },
    ],
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastDownloadedAt: {
      type: Date,
      default: null,
    },
    lastDownloadedNoteTitle: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function savePassword(next) {
  if (!this.password || !this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
