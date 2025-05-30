require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');
const Visit = require('./models/visit');
const ContestStat = require('./models/contestStat'); // If you have contest schema
const connectDB = require('./db');

const seed = async () => {
  await connectDB();

  const telegramId = '@srishtikumari24'; // Replace with your Telegram ID
  const name = 'Srishti';

  // Clean existing data
  await User.deleteMany({});
  await Visit.deleteMany({});
  await ContestStat.deleteMany({});

  // Insert user
  const user = new User({ telegramId, name, role: 'sales' });
  await user.save();

  // Insert visits (deals)
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    await new Visit({
      userId: telegramId,
      name,
      timestamp: new Date(now.getFullYear(), now.getMonth(), i + 1),
      saleDone: true,
      earning: 1000,
    }).save();
  }

  // Insert contest stats
  await new ContestStat({
    name,
    contestName: 'May Ki Party Offer',
    deals: 7,
    earnings: 7000,
  }).save();

  console.log('🌱 Dummy data seeded successfully.');
  process.exit();
};

seed();