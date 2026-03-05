const User = require('../models/User');

const ensureAdminUser = async () => {
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const adminName = (process.env.ADMIN_NAME || 'Admin').trim();

  if (!adminPassword || (!adminEmail && !adminUsername)) {
    return;
  }

  const lookup = [];
  if (adminEmail) {
    lookup.push({ email: adminEmail });
  }
  if (adminUsername) {
    lookup.push({ username: adminUsername });
  }

  const existingUser = await User.findOne({
    $or: lookup,
  }).select('+password');

  if (!existingUser) {
    await User.create({
      name: adminName,
      email: adminEmail || undefined,
      username: adminUsername,
      password: adminPassword,
      authProvider: 'local',
      role: 'admin',
      isBlocked: false,
    });
    console.log(`Seeded admin account: ${adminUsername}`);
    return;
  }

  let changed = false;

  if (existingUser.role !== 'admin') {
    existingUser.role = 'admin';
    changed = true;
  }
  if (existingUser.isBlocked) {
    existingUser.isBlocked = false;
    changed = true;
  }
  if (existingUser.authProvider !== 'local') {
    existingUser.authProvider = 'local';
    changed = true;
  }
  if (adminUsername && existingUser.username !== adminUsername) {
    existingUser.username = adminUsername;
    changed = true;
  }
  if (adminEmail && existingUser.email !== adminEmail) {
    existingUser.email = adminEmail;
    changed = true;
  }

  if (changed) {
    await existingUser.save();
    console.log(`Updated existing account to admin: ${adminUsername}`);
  }
};

module.exports = ensureAdminUser;
