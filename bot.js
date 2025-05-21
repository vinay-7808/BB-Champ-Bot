require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const cron = require('node-cron');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const connectDB = require('./db');
const User = require('./models/user');
const Visit = require('./models/visit');
const Lead = require('./models/lead');

connectDB();

let pendingVisit = {};

bot.onText(/\/start/, async (msg) => {
  const id = msg.from.id.toString();
  let user = await User.findOne({ telegramId: id });
  if (!user) {
    user = new User({ telegramId: id, name: msg.from.first_name });
    await user.save();
  }
  bot.sendMessage(msg.chat.id, `Welcome ${msg.from.first_name}! Use this bot to log visits and sales.`);
});

bot.on('photo', async (msg) => {
  const fileId = msg.photo[msg.photo.length - 1].file_id;
  const userId = msg.from.id.toString();
  pendingVisit[userId] = { photoFileId: fileId, name: msg.from.first_name };
  bot.sendMessage(msg.chat.id, "Got your selfie. Please send your location now.");
});

bot.on('location', async (msg) => {
  const userId = msg.from.id.toString();
  if (!pendingVisit[userId]) return bot.sendMessage(msg.chat.id, "Send your selfie first.");

  const visit = new Visit({
    userId,
    name: pendingVisit[userId].name,
    photoFileId: pendingVisit[userId].photoFileId,
    location: {
      latitude: msg.location.latitude,
      longitude: msg.location.longitude
    }
  });

  await visit.save();
  delete pendingVisit[userId];
  bot.sendMessage(msg.chat.id, "Visit recorded successfully.");
});

bot.on('message', async (msg) => {
  const text = msg.text?.toLowerCase();
  const userId = msg.from.id.toString();

  if (text === 'sale done') {
    const lastVisit = await Visit.findOne({ userId }).sort({ timestamp: -1 });
    if (lastVisit) {
      lastVisit.saleDone = true;
      await lastVisit.save();
      bot.sendMessage(msg.chat.id, "Sale recorded successfully.");
    } else {
      bot.sendMessage(msg.chat.id, "No recent visit found.");
    }
  }

  if (text?.includes('remember lead id') && text?.includes('follow up after')) {
    const match = text.match(/lead id (\d+).*after (\d+) days/);
    if (match) {
      const leadId = match[1];
      const days = parseInt(match[2]);
      const remindAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      await new Lead({ userId, leadId, remindAt }).save();
      bot.sendMessage(msg.chat.id, `Reminder set for lead ${leadId} after ${days} days.`);
    }
  }

  if (text?.toLowerCase().startsWith("what's")) {
    const nameMatch = text.match(/what's (.+?)'s progress today/i);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      const user = await User.findOne({ name: new RegExp(`^${name}$`, 'i') });
      if (!user) return bot.sendMessage(msg.chat.id, `No salesperson found with name "${name}".`);

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const visits = await Visit.find({ userId: user.telegramId, timestamp: { $gte: start, $lte: end } });
      const sales = visits.filter(v => v.saleDone).length;
      const total = visits.length;

      bot.sendMessage(msg.chat.id, `📊 Progress for ${user.name} today:\n🧭 Visits: ${total}\n✅ Sales: ${sales}\n📌 Pending Follow-ups: [manual review pending]`);
    }
  }

  if (text?.startsWith("performance report")) {
    const match = text.match(/performance report (.+)/i);
    if (match) {
      const name = match[1].trim();
      const user = await User.findOne({ name: new RegExp(`^${name}$`, 'i') });
      if (!user) return bot.sendMessage(msg.chat.id, `No salesperson found with name "${name}".`);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const thisMonthVisits = await Visit.find({ userId: user.telegramId, timestamp: { $gte: startOfMonth } });
      const lastMonthVisits = await Visit.find({ userId: user.telegramId, timestamp: { $gte: startOfLastMonth, $lte: endOfLastMonth } });

      const thisMonthSales = thisMonthVisits.filter(v => v.saleDone).length;
      const lastMonthSales = lastMonthVisits.filter(v => v.saleDone).length;

      const conversionRate = thisMonthVisits.length ? ((thisMonthSales / thisMonthVisits.length) * 100).toFixed(2) : 0;
      const growth = lastMonthSales ? (((thisMonthSales - lastMonthSales) / lastMonthSales) * 100).toFixed(2) : 'N/A';
      const target = 50;
      const incentivePerSale = 1000;
      const earned = thisMonthSales * incentivePerSale;
      const neededForIncentive = Math.max(0, target - thisMonthSales);

      bot.sendMessage(msg.chat.id, `📈 Performance Report for ${user.name}:
✅ Sales this month: ${thisMonthSales}
📊 Conversion rate: ${conversionRate}%
📅 Monthly growth: ${growth}%
🎯 Sales target: ${target}
💰 Incentives earned: ₹${earned}
📌 More sales needed for target: ${neededForIncentive}`);
    }
  }
});

cron.schedule('0 * * * *', async () => {
  const now = new Date();
  const leads = await Lead.find({ remindAt: { $lte: now }, reminded: false });
  for (const lead of leads) {
    await bot.sendMessage(lead.userId, `Reminder: Follow up on lead ID ${lead.leadId}`);
    lead.reminded = true;
    await lead.save();
  }
});

cron.schedule('0 19 * * *', async () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  const users = await User.find({ role: 'sales' });
  for (const user of users) {
    const visits = await Visit.find({ userId: user.telegramId, timestamp: { $gte: start, $lte: end }, saleDone: true });
    const earnings = visits.length * 1000;
    await bot.sendMessage(user.telegramId, `Good job ${user.name}! Today you earned ₹${earnings}. Let’s try to earn ₹${earnings + 1000} tomorrow!`);
  }
});