const mongoose = require('mongoose');
const visitSchema = new mongoose.Schema({
  userId: String,
  timestamp: { type: Date, default: Date.now },
  saleDone: Boolean,
  earning: Number
});
module.exports = mongoose.model('Visit', visitSchema);