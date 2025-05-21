const mongoose = require('mongoose');
module.exports = mongoose.model('Visit', new mongoose.Schema({
  userId: String,
  name: String,
  photoFileId: String,
  location: {
    latitude: Number,
    longitude: Number,
  },
  timestamp: { type: Date, default: Date.now },
  saleDone: { type: Boolean, default: false },
}));