const mongoose = require('mongoose');

const noteReportSchema = new mongoose.Schema(
  {
    noteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      required: true,
      index: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ['spam', 'copyright', 'inaccurate', 'inappropriate', 'other'],
      default: 'other',
    },
    details: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['open', 'resolved', 'dismissed'],
      default: 'open',
      index: true,
    },
    actionTaken: {
      type: String,
      enum: ['none', 'hidden', 'deleted'],
      default: 'none',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    noteTitle: {
      type: String,
      trim: true,
      default: '',
    },
    noteOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    noteOwnerName: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

noteReportSchema.index({ noteId: 1, reportedBy: 1, status: 1 });

module.exports = mongoose.model('NoteReport', noteReportSchema);
