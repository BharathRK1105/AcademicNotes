const mongoose = require('mongoose');

const adminActionSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: [
        'block_user',
        'unblock_user',
        'hide_note',
        'unhide_note',
        'delete_user',
        'delete_note',
        'auto_hide_note',
        'auto_unhide_note',
      ],
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['user', 'note'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetLabel: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AdminAction', adminActionSchema);
