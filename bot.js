require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const cron = require('node-cron');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const connectDB = require('./db');
const User = require('./models/user');
const Visit = require('./models/visit');
const ContestStat = require('./models/contestStat');

connectDB();

// 🌅 1. Morning Motivation Message
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const users = await User.find({ role: 'sales' });

  for (const user of users) {
    const earnings = await Visit.aggregate([
      { $match: { userId: user.telegramId, timestamp: { $gte: startOfMonth }, saleDone: true } },
      { $group: { _id: null, total: { $sum: "$earning" } } }
    ]);

    const totalEarned = earnings[0]?.total || 0;

    const msg = `Good morning ${user.name}! 🌞 You’ve already earned ₹${totalEarned} this May! What a superstar 💫 Well done!\n‘May Ki Party Offer’ mein full josh chahiye – chalo aaj aur kamaate hai! 🎉`;

    await bot.sendMessage(user.telegramId, msg);
  }
});

// 🏆 2. Contest & Leaderboard Hype
bot.onText(/contest update/i, async (msg) => {
  const stats = await ContestStat.find({ contestName: "May Ki Party Offer" }).sort({ earnings: -1 });
  let update = `🔥 Contest Update – May Ki Party Offer:\n`;

  stats.slice(0, 5).forEach((s, i) => {
    update += `${i === 0 ? "👑" : "⚡"} ${s.name} closed ${s.deals} deals and earned ₹${s.earnings}\n`;
  });

  await bot.sendMessage(msg.chat.id, update);
});

// Query: What's Srishti's rank?
bot.onText(/what'?s (.+?)'s rank/i, async (msg, match) => {
  const name = match[1].trim();

  const stats = await ContestStat.find({ contestName: "May Ki Party Offer" }).sort({ earnings: -1 });
  const index = stats.findIndex(s => s.name.toLowerCase() === name.toLowerCase());

  if (index === -1) return bot.sendMessage(msg.chat.id, `${name} is not on the contest leaderboard.`);

  const current = stats[index];
  const next = stats[index - 1];

  const remainingSales = next ? Math.max(0, next.deals - current.deals + 1) : 0;

  const response = `${name} is currently at Rank ${index + 1}. Just ${remainingSales} more sales and you’ll be on the leaderboard! 🎯\nBuckle up champ — the party’s waiting! 🎉🍕`;
  await bot.sendMessage(msg.chat.id, response);
});

// 📊 3. Manager (SM) Query
bot.onText(/check (.+?)'s performance/i, async (msg, match) => {
  const name = match[1].trim();
  const user = await User.findOne({ name: new RegExp(`^${name}$`, 'i') });

  if (!user) return bot.sendMessage(msg.chat.id, `No salesperson found with name "${name}".`);

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = now;

  const visits = await Visit.find({ userId: user.telegramId, timestamp: { $gte: start, $lte: end }, saleDone: true });

  const totalSales = visits.length;
  const earnings = visits.reduce((sum, v) => sum + v.earning, 0);
  const l2a = totalSales ? ((totalSales / 295) * 100).toFixed(1) : '0.0'; // mock L2A
  const salesLeft = Math.max(0, Math.ceil((15000 - earnings) / 1000));

  const report = `${user.name} has closed ${totalSales} deals in the last ${now.getDate()} days. Her L2A is at ${l2a}%. She needs just ${salesLeft} more sale${salesLeft !== 1 ? 's' : ''} to cross ₹15,000 in earnings!`;

  await bot.sendMessage(msg.chat.id, report);
});
// bot.on('message', (msg) => {
//   console.log("Chat ID:", msg.chat.id);
// });