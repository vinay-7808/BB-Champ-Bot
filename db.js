const mongoose = require('mongoose');
module.exports = function connectDB() {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB error:", err));
};