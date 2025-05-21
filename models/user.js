const mongoose = require('mongoose');
module.exports = mongoose.model('User', new mongoose.Schema({
  telegramId: String,
  name: String,
  role: { type: String, enum: ['sales', 'manager'], default: 'sales' },
}));