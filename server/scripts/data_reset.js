const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../db/database');

async function runCleanup() {
  console.log('🚀 Starting MessConnect Production Reset...');

  // 1. Clean JSON Database
  console.log('\n--- 1. CLEANING JSON DATABASE ---');
  const prevUsersCount = db.data.users?.length || 0;
  const prevMessesCount = db.data.messes?.length || 0;
  const prevSubsCount = db.data.subscriptions?.length || 0;
  const prevAttendanceCount = db.data.attendance?.length || 0;
  const prevSessionsCount = db.data.attendanceSessions?.length || 0;

  console.log(`Before cleanup: ${prevUsersCount} users, ${prevMessesCount} messes, ${prevSubsCount} subscriptions, ${prevAttendanceCount} attendance logs`);

  // Retain ONLY Admin user
  const adminUsers = (db.data.users || []).filter(u => u.role === 'ADMIN');
  if (adminUsers.length === 0) {
    adminUsers.push({
      id: 'user_admin_1',
      name: 'Super Admin',
      email: 'admin@messconnect.in',
      phone: '9423490513',
      password: 'password123',
      role: 'ADMIN',
      department: 'Platform Administration',
      verified: true
    });
  }

  db.data.users = adminUsers;
  db.data.messes = [];
  db.data.subscriptions = [];
  db.data.trials = [];
  db.data.payments = [];
  db.data.reviews = [];
  db.data.notifications = (db.data.notifications || []).filter(n => adminUsers.some(a => a.id === n.userId));
  db.data.complaints = [];
  db.data.offers = [];
  db.data.checkins = [];
  db.data.flexipasses = [];
  db.data.groups = [];
  db.data.favorites = [];
  db.data.searchHistory = [];
  db.data.attendanceSessions = [];
  db.data.attendance = [];
  db.data.attendanceAuditLogs = [];

  // Reset flexipass tiers participating messes to empty
  if (db.data.flexipassTiers) {
    db.data.flexipassTiers.forEach(tier => {
      tier.participatingMessIds = [];
    });
  }

  db.save();
  console.log('✅ JSON Database successfully reset: All students, messes, attendance, and subscriptions deleted.');
  console.log(`Remaining users in JSON: ${db.data.users.length} (Admin: ${db.data.users[0].email})`);

  // 2. Clean MySQL Database
  console.log('\n--- 2. CLEANING MYSQL DATABASE ---');
  try {
    const DB_CONFIG = {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'messconnectproject'
    };

    const conn = await mysql.createConnection(DB_CONFIG);
    console.log(`Connected to MySQL: ${DB_CONFIG.database}`);

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    const tablesToTruncate = [
      'messes',
      'subscriptions',
      'trials',
      'payments',
      'reviews',
      'notifications',
      'complaints',
      'offers',
      'checkins',
      'flexipasses',
      'groups',
      'favorites',
      'search_history',
      'attendance_sessions',
      'attendance',
      'attendance_audit_logs'
    ];

    for (const table of tablesToTruncate) {
      try {
        await conn.query(`TRUNCATE TABLE \`${table}\``);
        console.log(`  - Truncated table: ${table}`);
      } catch (err) {
        console.warn(`  - Warning truncating ${table}:`, err.message);
      }
    }

    // Delete all users except ADMIN
    await conn.query("DELETE FROM `users` WHERE `role` != 'ADMIN'");
    console.log("  - Deleted all non-admin users (students & owners) from `users`");

    // Ensure Admin user exists in MySQL
    await conn.query(`
      INSERT INTO \`users\` (
        \`id\`, \`name\`, \`email\`, \`phone\`, \`password\`, \`role\`, \`avatar\`, \`department\`, \`verified\`
      ) VALUES (
        'user_admin_1', 'Super Admin', 'admin@messconnect.in', '9423490513', 'password123', 'ADMIN',
        '', 'Platform Administration', 1
      )
      ON DUPLICATE KEY UPDATE \`role\` = 'ADMIN', \`email\` = 'admin@messconnect.in', \`name\` = 'Super Admin';
    `);
    console.log('  - Verified Super Admin user in MySQL');

    // Clean snapshot metadata
    await conn.query("DELETE FROM `db_meta` WHERE `meta_key` = 'db_full_snapshot'").catch(() => {});

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.end();
    console.log('✅ MySQL Database successfully cleaned!');
  } catch (err) {
    console.warn('⚠️ MySQL connection/cleanup note:', err.message);
  }

  console.log('\n🎉 ALL REQUESTED DATA HAS BEEN SAFELY EMPTIED!');
  process.exit(0);
}

runCleanup();
