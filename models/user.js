const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  telegramId: String,
  name: String,
  role: { type: String, default: 'sales' }
});
module.exports = mongoose.model('User', userSchema);