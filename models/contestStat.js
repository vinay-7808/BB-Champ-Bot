const mongoose = require('mongoose');
const statSchema = new mongoose.Schema({
  name: String,
  contestName: String,
  deals: Number,
  earnings: Number
});
module.exports = mongoose.model('ContestStat', statSchema);