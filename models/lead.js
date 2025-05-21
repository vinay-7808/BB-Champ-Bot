const mongoose = require('mongoose');
module.exports = mongoose.model('Lead', new mongoose.Schema({
  userId: String,
  leadId: String,
  remindAt: Date,
  reminded: { type: Boolean, default: false },
}));