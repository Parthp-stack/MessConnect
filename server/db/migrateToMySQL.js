const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const seedData = require('./seedData');

const isSslRequired = process.env.DB_SSL === 'REQUIRED' || process.env.DB_SSL === 'true' || process.env.DB_SSL_MODE === 'REQUIRED';
let sslConfig = undefined;
if (isSslRequired) {
  sslConfig = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
  };
  if (process.env.DB_SSL_CA && fs.existsSync(process.env.DB_SSL_CA)) {
    sslConfig.ca = fs.readFileSync(process.env.DB_SSL_CA);
  }
}

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'messconnectproject',
  multipleStatements: true,
  ...(sslConfig ? { ssl: sslConfig } : {})
};

async function getWorkingConnection(dbName = null) {
  const candidates = [
    { host: DB_CONFIG.host, port: DB_CONFIG.port, user: DB_CONFIG.user, password: DB_CONFIG.password, ...(sslConfig ? { ssl: sslConfig } : {}) }
  ];

  for (const cred of candidates) {
    try {
      const cfg = { ...cred, multipleStatements: true };
      if (dbName) cfg.database = dbName;
      const conn = await mysql.createConnection(cfg);
      return { conn, cred };
    } catch (err) {
      // try next candidate
    }
  }
  throw new Error('Unable to connect to MySQL with any configured credentials');
}

async function migrateData() {
  console.log('🔄 Connecting to MySQL server...');
  
  // 1. First ensure database exists (or connect directly if on managed cloud like Aiven)
  try {
    const { conn: serverConn, cred: workingCred } = await getWorkingConnection();
    console.log(`🐬 Connected to MySQL server as ${workingCred.user}@${workingCred.host}`);

    try {
      await serverConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      console.log(`✅ Database \`${DB_CONFIG.database}\` confirmed.`);
    } catch (dbErr) {
      console.log(`ℹ️ Note: Database ${DB_CONFIG.database} already managed.`);
    }
    await serverConn.end();
  } catch (err) {
    console.log('ℹ️ Connecting directly to target database...');
  }

  // 2. Connect to the target database
  const { conn: db } = await getWorkingConnection(DB_CONFIG.database);
  console.log(`✅ Connected to database: ${DB_CONFIG.database}`);

  // 1. Create Tables
  console.log('📐 Creating / verifying tables schema...');
  const tableStatements = [
    `CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`email\` VARCHAR(255),
      \`phone\` VARCHAR(50),
      \`password\` VARCHAR(255) DEFAULT 'password123',
      \`role\` VARCHAR(50) DEFAULT 'CUSTOMER',
      \`avatar\` TEXT,
      \`college\` VARCHAR(255),
      \`location\` VARCHAR(255),
      \`diet\` VARCHAR(100),
      \`department\` VARCHAR(255),
      \`preferences\` JSON,
      \`verificationStatus\` VARCHAR(50),
      \`verified\` BOOLEAN DEFAULT FALSE,
      \`reviewNotes\` TEXT,
      \`documents\` JSON,
      \`messId\` VARCHAR(100),
      \`messName\` VARCHAR(255),
      \`createdAt\` VARCHAR(100),
      \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`messes\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`ownerId\` VARCHAR(100),
      \`name\` VARCHAR(255) NOT NULL,
      \`tagline\` TEXT,
      \`description\` TEXT,
      \`area\` VARCHAR(255),
      \`city\` VARCHAR(100),
      \`pincode\` VARCHAR(20),
      \`address\` TEXT,
      \`coordinates\` JSON,
      \`distance\` VARCHAR(50),
      \`rating\` DECIMAL(3, 1) DEFAULT 5.0,
      \`reviewCount\` INT DEFAULT 0,
      \`pricePerMonth\` INT DEFAULT 3200,
      \`isPureVeg\` BOOLEAN DEFAULT FALSE,
      \`hasVeg\` BOOLEAN DEFAULT TRUE,
      \`hasNonVeg\` BOOLEAN DEFAULT TRUE,
      \`trialAvailable\` BOOLEAN DEFAULT TRUE,
      \`trialPrice\` INT DEFAULT 70,
      \`verified\` BOOLEAN DEFAULT FALSE,
      \`featured\` BOOLEAN DEFAULT FALSE,
      \`status\` VARCHAR(50) DEFAULT 'ACTIVE',
      \`verificationStatus\` VARCHAR(50) DEFAULT 'APPROVED',
      \`reviewNotes\` TEXT,
      \`documents\` JSON,
      \`phone\` VARCHAR(50),
      \`whatsapp\` VARCHAR(50),
      \`email\` VARCHAR(255),
      \`coverImage\` TEXT,
      \`gallery\` JSON,
      \`timings\` JSON,
      \`features\` JSON,
      \`plans\` JSON,
      \`menuToday\` JSON,
      \`weeklyMenu\` JSON,
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`subscriptions\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`userId\` VARCHAR(100) NOT NULL,
      \`userName\` VARCHAR(255),
      \`messId\` VARCHAR(100) NOT NULL,
      \`messName\` VARCHAR(255),
      \`planId\` VARCHAR(100),
      \`planName\` VARCHAR(255),
      \`amount\` INT,
      \`meals\` JSON,
      \`status\` VARCHAR(50) DEFAULT 'ACTIVE',
      \`totalDays\` INT DEFAULT 30,
      \`activeDays\` INT DEFAULT 0,
      \`pausedDays\` INT DEFAULT 0,
      \`remainingDays\` INT DEFAULT 30,
      \`startDate\` VARCHAR(50),
      \`endDate\` VARCHAR(50),
      \`pauses\` JSON,
      \`cancelReason\` TEXT,
      \`cancelledAt\` VARCHAR(100),
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`trials\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`userId\` VARCHAR(100) NOT NULL,
      \`userName\` VARCHAR(255),
      \`userPhone\` VARCHAR(50),
      \`messId\` VARCHAR(100) NOT NULL,
      \`messName\` VARCHAR(255),
      \`mealType\` VARCHAR(50),
      \`date\` VARCHAR(50),
      \`price\` INT DEFAULT 70,
      \`status\` VARCHAR(50) DEFAULT 'PENDING',
      \`createdAt\` VARCHAR(100),
      \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`payments\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`userId\` VARCHAR(100) NOT NULL,
      \`messId\` VARCHAR(100),
      \`subscriptionId\` VARCHAR(100),
      \`trialId\` VARCHAR(100),
      \`amount\` INT NOT NULL,
      \`method\` VARCHAR(100),
      \`status\` VARCHAR(50) DEFAULT 'SUCCESS',
      \`description\` TEXT,
      \`date\` VARCHAR(100),
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`reviews\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`messId\` VARCHAR(100) NOT NULL,
      \`userId\` VARCHAR(100) NOT NULL,
      \`userName\` VARCHAR(255),
      \`userAvatar\` TEXT,
      \`rating\` INT DEFAULT 5,
      \`ratingsBreakdown\` JSON,
      \`comment\` TEXT,
      \`date\` VARCHAR(50),
      \`ownerResponse\` TEXT,
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`notifications\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`userId\` VARCHAR(100),
      \`broadcast\` BOOLEAN DEFAULT FALSE,
      \`channel\` VARCHAR(100),
      \`title\` VARCHAR(255),
      \`message\` TEXT,
      \`read\` BOOLEAN DEFAULT FALSE,
      \`type\` VARCHAR(100),
      \`time\` VARCHAR(50),
      \`timestamp\` VARCHAR(100),
      \`createdAt\` VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`complaints\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`userId\` VARCHAR(100) NOT NULL,
      \`userName\` VARCHAR(255),
      \`messId\` VARCHAR(100),
      \`messName\` VARCHAR(255),
      \`category\` VARCHAR(100),
      \`subject\` VARCHAR(255),
      \`description\` TEXT,
      \`status\` VARCHAR(50) DEFAULT 'OPEN',
      \`adminNotes\` TEXT,
      \`date\` VARCHAR(50),
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`offers\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`messId\` VARCHAR(100) NOT NULL,
      \`messName\` VARCHAR(255),
      \`title\` VARCHAR(255) NOT NULL,
      \`description\` TEXT,
      \`discountPercent\` INT,
      \`validUntil\` VARCHAR(50),
      \`code\` VARCHAR(50),
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`checkins\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`subscriptionId\` VARCHAR(100),
      \`flexipassId\` VARCHAR(100),
      \`userId\` VARCHAR(100) NOT NULL,
      \`userName\` VARCHAR(255),
      \`userPhone\` VARCHAR(50),
      \`messId\` VARCHAR(100) NOT NULL,
      \`messName\` VARCHAR(255),
      \`mealType\` VARCHAR(50),
      \`date\` VARCHAR(50),
      \`time\` VARCHAR(50),
      \`token4Digit\` VARCHAR(10),
      \`qrCodePayload\` TEXT,
      \`status\` VARCHAR(50) DEFAULT 'VALID',
      \`method\` VARCHAR(50) DEFAULT 'QR_SCAN',
      \`planName\` VARCHAR(255),
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`flexipass_tiers\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`subtitle\` VARCHAR(255),
      \`description\` TEXT,
      \`mealCredits\` INT,
      \`price\` INT,
      \`pricePerMeal\` INT,
      \`validityDays\` INT,
      \`clusterName\` VARCHAR(255),
      \`badge\` VARCHAR(100),
      \`participatingMessIds\` JSON,
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`flexipasses\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`userId\` VARCHAR(100) NOT NULL,
      \`userName\` VARCHAR(255),
      \`tierId\` VARCHAR(100),
      \`tierName\` VARCHAR(255),
      \`totalCredits\` INT,
      \`creditsRemaining\` INT,
      \`creditsUsed\` INT DEFAULT 0,
      \`startDate\` VARCHAR(50),
      \`validUntil\` VARCHAR(50),
      \`status\` VARCHAR(50) DEFAULT 'ACTIVE',
      \`clusterName\` VARCHAR(255),
      \`participatingMessIds\` JSON,
      \`history\` JSON,
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`groups\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`inviteCode\` VARCHAR(50) UNIQUE,
      \`adminUserId\` VARCHAR(100),
      \`adminName\` VARCHAR(255),
      \`messId\` VARCHAR(100),
      \`messName\` VARCHAR(255),
      \`discountPercent\` INT DEFAULT 10,
      \`createdAt\` VARCHAR(50),
      \`members\` JSON,
      \`vacationSyncHistory\` JSON,
      \`giftedMeals\` JSON
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`favorites\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`userId\` VARCHAR(100) DEFAULT 'user_cust_1',
      \`messId\` VARCHAR(100) NOT NULL,
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY \`unique_user_mess\` (\`userId\`, \`messId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`search_history\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`userId\` VARCHAR(100) DEFAULT 'user_cust_1',
      \`term\` VARCHAR(255) NOT NULL,
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`attendance_sessions\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`messId\` VARCHAR(100) NOT NULL,
      \`messName\` VARCHAR(255),
      \`sessionType\` VARCHAR(50) NOT NULL,
      \`date\` VARCHAR(50) NOT NULL,
      \`token\` VARCHAR(255) NOT NULL UNIQUE,
      \`expiresAt\` VARCHAR(100) NOT NULL,
      \`status\` VARCHAR(50) DEFAULT 'ACTIVE',
      \`createdById\` VARCHAR(100),
      \`createdAt\` VARCHAR(100),
      INDEX \`idx_att_sess_mess_date\` (\`messId\`, \`date\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`attendance\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`studentId\` VARCHAR(100) NOT NULL,
      \`studentName\` VARCHAR(255),
      \`messId\` VARCHAR(100) NOT NULL,
      \`messName\` VARCHAR(255),
      \`sessionId\` VARCHAR(100),
      \`attendanceDate\` VARCHAR(50) NOT NULL,
      \`sessionType\` VARCHAR(50) NOT NULL,
      \`status\` VARCHAR(50) NOT NULL DEFAULT 'PRESENT',
      \`markedAt\` VARCHAR(100),
      \`createdAt\` VARCHAR(100),
      UNIQUE KEY \`uniq_student_mess_date_session\` (\`studentId\`, \`messId\`, \`attendanceDate\`, \`sessionType\`),
      INDEX \`idx_att_mess_date_session\` (\`messId\`, \`attendanceDate\`, \`sessionType\`),
      INDEX \`idx_att_student_date\` (\`studentId\`, \`attendanceDate\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`attendance_audit_logs\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`userId\` VARCHAR(100),
      \`userName\` VARCHAR(255),
      \`role\` VARCHAR(50),
      \`action\` VARCHAR(100) NOT NULL,
      \`messId\` VARCHAR(100) NOT NULL,
      \`messName\` VARCHAR(255),
      \`studentId\` VARCHAR(100),
      \`studentName\` VARCHAR(255),
      \`sessionType\` VARCHAR(50),
      \`date\` VARCHAR(50),
      \`time\` VARCHAR(50),
      \`reason\` TEXT,
      \`oldStatus\` VARCHAR(50),
      \`newStatus\` VARCHAR(50),
      \`details\` JSON,
      \`ipAddress\` VARCHAR(100),
      \`createdAt\` VARCHAR(100),
      INDEX \`idx_audit_mess_date\` (\`messId\`, \`date\`),
      INDEX \`idx_audit_student\` (\`studentId\`),
      INDEX \`idx_audit_action\` (\`action\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`attendance_settings\` (
      \`messId\` VARCHAR(100) PRIMARY KEY,
      \`breakfastStart\` VARCHAR(20) DEFAULT '07:30',
      \`breakfastEnd\` VARCHAR(20) DEFAULT '10:30',
      \`lunchStart\` VARCHAR(20) DEFAULT '12:00',
      \`lunchEnd\` VARCHAR(20) DEFAULT '15:30',
      \`dinnerStart\` VARCHAR(20) DEFAULT '19:30',
      \`dinnerEnd\` VARCHAR(20) DEFAULT '22:30',
      \`lowAttendanceThreshold\` INT DEFAULT 75,
      \`locationVerificationEnabled\` BOOLEAN DEFAULT FALSE,
      \`radiusMeters\` INT DEFAULT 100,
      \`autoRotateQrEnabled\` BOOLEAN DEFAULT FALSE,
      \`qrRotationIntervalMinutes\` INT DEFAULT 5,
      \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`db_meta\` (
      \`meta_key\` VARCHAR(100) PRIMARY KEY,
      \`meta_value\` LONGTEXT,
      \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  ];

  for (const query of tableStatements) {
    await db.query(query);
  }
  console.log('✅ All 20 database tables ready in MySQL.');

  // 2. Read existing data
  const jsonPath = path.join(__dirname, '..', 'data', 'messconnect.db.json');
  let currentData = {};
  if (fs.existsSync(jsonPath)) {
    try {
      currentData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      console.log('📖 Read current data from messconnect.db.json');
    } catch (e) {
      console.warn('⚠️ Could not parse messconnect.db.json, falling back to seedData:', e.message);
    }
  }

  // Merge with seed data for any missing arrays
  const source = {
    users: currentData.users || seedData.users || [],
    messes: currentData.messes || seedData.messes || [],
    subscriptions: currentData.subscriptions || seedData.subscriptions || [],
    trials: currentData.trials || seedData.trials || [],
    payments: currentData.payments || seedData.payments || [],
    reviews: currentData.reviews || seedData.reviews || [],
    notifications: currentData.notifications || seedData.notifications || [],
    complaints: currentData.complaints || seedData.complaints || [],
    offers: currentData.offers || seedData.offers || [],
    checkins: currentData.checkins || seedData.checkins || [],
    flexipassTiers: currentData.flexipassTiers || seedData.flexipassTiers || [],
    flexipasses: currentData.flexipasses || seedData.flexipasses || [],
    groups: currentData.groups || seedData.groups || [],
    favorites: currentData.favorites || seedData.favorites || [],
    searchHistory: currentData.searchHistory || seedData.searchHistory || [],
    attendanceSessions: currentData.attendanceSessions || [],
    attendance: currentData.attendance || [],
    attendanceAuditLogs: currentData.attendanceAuditLogs || [],
    attendanceSettings: currentData.attendanceSettings || []
  };

  // Helper function to stringify JSON fields
  const toJSON = (val) => val !== undefined && val !== null ? JSON.stringify(val) : null;

  // 3. Copy Users
  console.log(`📦 Copying ${source.users.length} users into MySQL...`);
  for (const u of source.users) {
    await db.query(`
      INSERT INTO \`users\` (
        \`id\`, \`name\`, \`email\`, \`phone\`, \`password\`, \`role\`, \`avatar\`, \`college\`,
        \`location\`, \`diet\`, \`department\`, \`preferences\`, \`verificationStatus\`, \`verified\`,
        \`reviewNotes\`, \`documents\`, \`messId\`, \`messName\`, \`createdAt\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`name\` = VALUES(\`name\`),
        \`email\` = VALUES(\`email\`),
        \`phone\` = VALUES(\`phone\`),
        \`password\` = VALUES(\`password\`),
        \`role\` = VALUES(\`role\`),
        \`avatar\` = VALUES(\`avatar\`),
        \`college\` = VALUES(\`college\`),
        \`location\` = VALUES(\`location\`),
        \`diet\` = VALUES(\`diet\`),
        \`department\` = VALUES(\`department\`),
        \`preferences\` = VALUES(\`preferences\`),
        \`verificationStatus\` = VALUES(\`verificationStatus\`),
        \`verified\` = VALUES(\`verified\`),
        \`reviewNotes\` = VALUES(\`reviewNotes\`),
        \`documents\` = VALUES(\`documents\`),
        \`messId\` = VALUES(\`messId\`),
        \`messName\` = VALUES(\`messName\`);
    `, [
      u.id, u.name || '', u.email || null, u.phone || null, u.password || 'password123', u.role || 'CUSTOMER',
      u.avatar || null, u.college || null, u.location || null, u.diet || null, u.department || null,
      toJSON(u.preferences), u.verificationStatus || null, Boolean(u.verified),
      u.reviewNotes || null, toJSON(u.documents), u.messId || null, u.messName || null, u.createdAt || null
    ]);
  }

  // 4. Copy Messes
  console.log(`📦 Copying ${source.messes.length} messes into MySQL...`);
  for (const m of source.messes) {
    await db.query(`
      INSERT INTO \`messes\` (
        \`id\`, \`ownerId\`, \`name\`, \`tagline\`, \`description\`, \`area\`, \`city\`, \`pincode\`,
        \`address\`, \`coordinates\`, \`distance\`, \`rating\`, \`reviewCount\`, \`pricePerMonth\`,
        \`isPureVeg\`, \`hasVeg\`, \`hasNonVeg\`, \`trialAvailable\`, \`trialPrice\`, \`verified\`,
        \`featured\`, \`status\`, \`verificationStatus\`, \`reviewNotes\`, \`documents\`, \`phone\`,
        \`whatsapp\`, \`email\`, \`coverImage\`, \`gallery\`, \`timings\`, \`features\`, \`plans\`,
        \`menuToday\`, \`weeklyMenu\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`ownerId\` = VALUES(\`ownerId\`),
        \`name\` = VALUES(\`name\`),
        \`tagline\` = VALUES(\`tagline\`),
        \`description\` = VALUES(\`description\`),
        \`area\` = VALUES(\`area\`),
        \`city\` = VALUES(\`city\`),
        \`pincode\` = VALUES(\`pincode\`),
        \`address\` = VALUES(\`address\`),
        \`coordinates\` = VALUES(\`coordinates\`),
        \`distance\` = VALUES(\`distance\`),
        \`rating\` = VALUES(\`rating\`),
        \`reviewCount\` = VALUES(\`reviewCount\`),
        \`pricePerMonth\` = VALUES(\`pricePerMonth\`),
        \`isPureVeg\` = VALUES(\`isPureVeg\`),
        \`hasVeg\` = VALUES(\`hasVeg\`),
        \`hasNonVeg\` = VALUES(\`hasNonVeg\`),
        \`trialAvailable\` = VALUES(\`trialAvailable\`),
        \`trialPrice\` = VALUES(\`trialPrice\`),
        \`verified\` = VALUES(\`verified\`),
        \`featured\` = VALUES(\`featured\`),
        \`status\` = VALUES(\`status\`),
        \`verificationStatus\` = VALUES(\`verificationStatus\`),
        \`reviewNotes\` = VALUES(\`reviewNotes\`),
        \`documents\` = VALUES(\`documents\`),
        \`phone\` = VALUES(\`phone\`),
        \`whatsapp\` = VALUES(\`whatsapp\`),
        \`email\` = VALUES(\`email\`),
        \`coverImage\` = VALUES(\`coverImage\`),
        \`gallery\` = VALUES(\`gallery\`),
        \`timings\` = VALUES(\`timings\`),
        \`features\` = VALUES(\`features\`),
        \`plans\` = VALUES(\`plans\`),
        \`menuToday\` = VALUES(\`menuToday\`),
        \`weeklyMenu\` = VALUES(\`weeklyMenu\`);
    `, [
      m.id, m.ownerId || null, m.name || '', m.tagline || null, m.description || null, m.area || null, m.city || null, m.pincode || null,
      m.address || null, toJSON(m.coordinates), m.distance || null, m.rating || 5.0, m.reviewCount || 0, m.pricePerMonth || 3200,
      Boolean(m.isPureVeg), Boolean(m.hasVeg), Boolean(m.hasNonVeg), Boolean(m.trialAvailable), m.trialPrice || 70, Boolean(m.verified),
      Boolean(m.featured), m.status || 'ACTIVE', m.verificationStatus || 'APPROVED', m.reviewNotes || null, toJSON(m.documents), m.phone || null,
      m.whatsapp || null, m.email || null, m.coverImage || null, toJSON(m.gallery), toJSON(m.timings), toJSON(m.features), toJSON(m.plans),
      toJSON(m.menuToday), toJSON(m.weeklyMenu)
    ]);
  }

  // 5. Copy Subscriptions
  console.log(`📦 Copying ${source.subscriptions.length} subscriptions into MySQL...`);
  for (const s of source.subscriptions) {
    await db.query(`
      INSERT INTO \`subscriptions\` (
        \`id\`, \`userId\`, \`userName\`, \`messId\`, \`messName\`, \`planId\`, \`planName\`,
        \`amount\`, \`meals\`, \`status\`, \`totalDays\`, \`activeDays\`, \`pausedDays\`,
        \`remainingDays\`, \`startDate\`, \`endDate\`, \`pauses\`, \`cancelReason\`, \`cancelledAt\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`userId\` = VALUES(\`userId\`),
        \`userName\` = VALUES(\`userName\`),
        \`messId\` = VALUES(\`messId\`),
        \`messName\` = VALUES(\`messName\`),
        \`planId\` = VALUES(\`planId\`),
        \`planName\` = VALUES(\`planName\`),
        \`amount\` = VALUES(\`amount\`),
        \`meals\` = VALUES(\`meals\`),
        \`status\` = VALUES(\`status\`),
        \`totalDays\` = VALUES(\`totalDays\`),
        \`activeDays\` = VALUES(\`activeDays\`),
        \`pausedDays\` = VALUES(\`pausedDays\`),
        \`remainingDays\` = VALUES(\`remainingDays\`),
        \`startDate\` = VALUES(\`startDate\`),
        \`endDate\` = VALUES(\`endDate\`),
        \`pauses\` = VALUES(\`pauses\`),
        \`cancelReason\` = VALUES(\`cancelReason\`),
        \`cancelledAt\` = VALUES(\`cancelledAt\`);
    `, [
      s.id, s.userId, s.userName || null, s.messId, s.messName || null, s.planId || null, s.planName || null,
      s.amount || 0, toJSON(s.meals), s.status || 'ACTIVE', s.totalDays || 30, s.activeDays || 0, s.pausedDays || 0,
      s.remainingDays || 30, s.startDate || null, s.endDate || null, toJSON(s.pauses), s.cancelReason || null, s.cancelledAt || null
    ]);
  }

  // 6. Copy Trials
  console.log(`📦 Copying ${source.trials.length} trials into MySQL...`);
  for (const t of source.trials) {
    await db.query(`
      INSERT INTO \`trials\` (
        \`id\`, \`userId\`, \`userName\`, \`userPhone\`, \`messId\`, \`messName\`,
        \`mealType\`, \`date\`, \`price\`, \`status\`, \`createdAt\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`userId\` = VALUES(\`userId\`),
        \`userName\` = VALUES(\`userName\`),
        \`userPhone\` = VALUES(\`userPhone\`),
        \`messId\` = VALUES(\`messId\`),
        \`messName\` = VALUES(\`messName\`),
        \`mealType\` = VALUES(\`mealType\`),
        \`date\` = VALUES(\`date\`),
        \`price\` = VALUES(\`price\`),
        \`status\` = VALUES(\`status\`);
    `, [
      t.id, t.userId, t.userName || null, t.userPhone || null, t.messId, t.messName || null,
      t.mealType || null, t.date || null, t.price || 70, t.status || 'PENDING', t.createdAt || null
    ]);
  }

  // 7. Copy Payments
  console.log(`📦 Copying ${source.payments.length} payments into MySQL...`);
  for (const p of source.payments) {
    await db.query(`
      INSERT INTO \`payments\` (
        \`id\`, \`userId\`, \`messId\`, \`subscriptionId\`, \`trialId\`, \`amount\`,
        \`method\`, \`status\`, \`description\`, \`date\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`userId\` = VALUES(\`userId\`),
        \`messId\` = VALUES(\`messId\`),
        \`subscriptionId\` = VALUES(\`subscriptionId\`),
        \`trialId\` = VALUES(\`trialId\`),
        \`amount\` = VALUES(\`amount\`),
        \`method\` = VALUES(\`method\`),
        \`status\` = VALUES(\`status\`),
        \`description\` = VALUES(\`description\`),
        \`date\` = VALUES(\`date\`);
    `, [
      p.id, p.userId, p.messId || null, p.subscriptionId || null, p.trialId || null, p.amount || 0,
      p.method || null, p.status || 'SUCCESS', p.description || null, p.date || null
    ]);
  }

  // 8. Copy Reviews
  console.log(`📦 Copying ${source.reviews.length} reviews into MySQL...`);
  for (const r of source.reviews) {
    await db.query(`
      INSERT INTO \`reviews\` (
        \`id\`, \`messId\`, \`userId\`, \`userName\`, \`userAvatar\`, \`rating\`,
        \`ratingsBreakdown\`, \`comment\`, \`date\`, \`ownerResponse\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`messId\` = VALUES(\`messId\`),
        \`userId\` = VALUES(\`userId\`),
        \`userName\` = VALUES(\`userName\`),
        \`userAvatar\` = VALUES(\`userAvatar\`),
        \`rating\` = VALUES(\`rating\`),
        \`ratingsBreakdown\` = VALUES(\`ratingsBreakdown\`),
        \`comment\` = VALUES(\`comment\`),
        \`date\` = VALUES(\`date\`),
        \`ownerResponse\` = VALUES(\`ownerResponse\`);
    `, [
      r.id, r.messId, r.userId, r.userName || null, r.userAvatar || null, r.rating || 5,
      toJSON(r.ratingsBreakdown), r.comment || null, r.date || null, r.ownerResponse || null
    ]);
  }

  // 9. Copy Notifications
  console.log(`📦 Copying ${source.notifications.length} notifications into MySQL...`);
  for (const n of source.notifications) {
    await db.query(`
      INSERT INTO \`notifications\` (
        \`id\`, \`userId\`, \`broadcast\`, \`channel\`, \`title\`, \`message\`,
        \`read\`, \`type\`, \`time\`, \`timestamp\`, \`createdAt\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`userId\` = VALUES(\`userId\`),
        \`broadcast\` = VALUES(\`broadcast\`),
        \`channel\` = VALUES(\`channel\`),
        \`title\` = VALUES(\`title\`),
        \`message\` = VALUES(\`message\`),
        \`read\` = VALUES(\`read\`),
        \`type\` = VALUES(\`type\`),
        \`time\` = VALUES(\`time\`),
        \`timestamp\` = VALUES(\`timestamp\`);
    `, [
      n.id, n.userId || null, Boolean(n.broadcast), n.channel || 'System', n.title || '', n.message || '',
      Boolean(n.read), n.type || null, n.time || null, n.timestamp || null, n.createdAt || null
    ]);
  }

  // 10. Copy Complaints
  console.log(`📦 Copying ${source.complaints.length} complaints into MySQL...`);
  for (const c of source.complaints) {
    await db.query(`
      INSERT INTO \`complaints\` (
        \`id\`, \`userId\`, \`userName\`, \`messId\`, \`messName\`, \`category\`,
        \`subject\`, \`description\`, \`status\`, \`adminNotes\`, \`date\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`userId\` = VALUES(\`userId\`),
        \`userName\` = VALUES(\`userName\`),
        \`messId\` = VALUES(\`messId\`),
        \`messName\` = VALUES(\`messName\`),
        \`category\` = VALUES(\`category\`),
        \`subject\` = VALUES(\`subject\`),
        \`description\` = VALUES(\`description\`),
        \`status\` = VALUES(\`status\`),
        \`adminNotes\` = VALUES(\`adminNotes\`),
        \`date\` = VALUES(\`date\`);
    `, [
      c.id, c.userId, c.userName || null, c.messId || null, c.messName || null, c.category || null,
      c.subject || null, c.description || null, c.status || 'OPEN', c.adminNotes || null, c.date || null
    ]);
  }

  // 11. Copy Offers
  console.log(`📦 Copying ${source.offers.length} offers into MySQL...`);
  for (const o of source.offers) {
    await db.query(`
      INSERT INTO \`offers\` (
        \`id\`, \`messId\`, \`messName\`, \`title\`, \`description\`,
        \`discountPercent\`, \`validUntil\`, \`code\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`messId\` = VALUES(\`messId\`),
        \`messName\` = VALUES(\`messName\`),
        \`title\` = VALUES(\`title\`),
        \`description\` = VALUES(\`description\`),
        \`discountPercent\` = VALUES(\`discountPercent\`),
        \`validUntil\` = VALUES(\`validUntil\`),
        \`code\` = VALUES(\`code\`);
    `, [
      o.id, o.messId, o.messName || null, o.title || '', o.description || null,
      o.discountPercent || null, o.validUntil || null, o.code || null
    ]);
  }

  // 12. Copy Checkins
  console.log(`📦 Copying ${source.checkins.length} checkins into MySQL...`);
  for (const ch of source.checkins) {
    await db.query(`
      INSERT INTO \`checkins\` (
        \`id\`, \`subscriptionId\`, \`flexipassId\`, \`userId\`, \`userName\`,
        \`userPhone\`, \`messId\`, \`messName\`, \`mealType\`, \`date\`,
        \`time\`, \`token4Digit\`, \`qrCodePayload\`, \`status\`, \`method\`, \`planName\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`subscriptionId\` = VALUES(\`subscriptionId\`),
        \`flexipassId\` = VALUES(\`flexipassId\`),
        \`userId\` = VALUES(\`userId\`),
        \`userName\` = VALUES(\`userName\`),
        \`userPhone\` = VALUES(\`userPhone\`),
        \`messId\` = VALUES(\`messId\`),
        \`messName\` = VALUES(\`messName\`),
        \`mealType\` = VALUES(\`mealType\`),
        \`date\` = VALUES(\`date\`),
        \`time\` = VALUES(\`time\`),
        \`token4Digit\` = VALUES(\`token4Digit\`),
        \`qrCodePayload\` = VALUES(\`qrCodePayload\`),
        \`status\` = VALUES(\`status\`),
        \`method\` = VALUES(\`method\`),
        \`planName\` = VALUES(\`planName\`);
    `, [
      ch.id, ch.subscriptionId || null, ch.flexipassId || null, ch.userId, ch.userName || null,
      ch.userPhone || null, ch.messId, ch.messName || null, ch.mealType || null, ch.date || null,
      ch.time || null, ch.token4Digit || null, ch.qrCodePayload || null, ch.status || 'VALID',
      ch.method || 'QR_SCAN', ch.planName || null
    ]);
  }

  // 13. Copy FlexiPass Tiers
  console.log(`📦 Copying ${source.flexipassTiers.length} flexipass tiers into MySQL...`);
  for (const ft of source.flexipassTiers) {
    await db.query(`
      INSERT INTO \`flexipass_tiers\` (
        \`id\`, \`name\`, \`subtitle\`, \`description\`, \`mealCredits\`,
        \`price\`, \`pricePerMeal\`, \`validityDays\`, \`clusterName\`, \`badge\`, \`participatingMessIds\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`name\` = VALUES(\`name\`),
        \`subtitle\` = VALUES(\`subtitle\`),
        \`description\` = VALUES(\`description\`),
        \`mealCredits\` = VALUES(\`mealCredits\`),
        \`price\` = VALUES(\`price\`),
        \`pricePerMeal\` = VALUES(\`pricePerMeal\`),
        \`validityDays\` = VALUES(\`validityDays\`),
        \`clusterName\` = VALUES(\`clusterName\`),
        \`badge\` = VALUES(\`badge\`),
        \`participatingMessIds\` = VALUES(\`participatingMessIds\`);
    `, [
      ft.id, ft.name, ft.subtitle || null, ft.description || null, ft.mealCredits || 0,
      ft.price || 0, ft.pricePerMeal || 0, ft.validityDays || 30, ft.clusterName || null,
      ft.badge || null, toJSON(ft.participatingMessIds)
    ]);
  }

  // 14. Copy FlexiPasses
  console.log(`📦 Copying ${source.flexipasses.length} active flexipasses into MySQL...`);
  for (const fp of source.flexipasses) {
    await db.query(`
      INSERT INTO \`flexipasses\` (
        \`id\`, \`userId\`, \`userName\`, \`tierId\`, \`tierName\`,
        \`totalCredits\`, \`creditsRemaining\`, \`creditsUsed\`, \`startDate\`,
        \`validUntil\`, \`status\`, \`clusterName\`, \`participatingMessIds\`, \`history\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`userId\` = VALUES(\`userId\`),
        \`userName\` = VALUES(\`userName\`),
        \`tierId\` = VALUES(\`tierId\`),
        \`tierName\` = VALUES(\`tierName\`),
        \`totalCredits\` = VALUES(\`totalCredits\`),
        \`creditsRemaining\` = VALUES(\`creditsRemaining\`),
        \`creditsUsed\` = VALUES(\`creditsUsed\`),
        \`startDate\` = VALUES(\`startDate\`),
        \`validUntil\` = VALUES(\`validUntil\`),
        \`status\` = VALUES(\`status\`),
        \`clusterName\` = VALUES(\`clusterName\`),
        \`participatingMessIds\` = VALUES(\`participatingMessIds\`),
        \`history\` = VALUES(\`history\`);
    `, [
      fp.id, fp.userId, fp.userName || null, fp.tierId || null, fp.tierName || null,
      fp.totalCredits || 0, fp.creditsRemaining || 0, fp.creditsUsed || 0, fp.startDate || null,
      fp.validUntil || null, fp.status || 'ACTIVE', fp.clusterName || null,
      toJSON(fp.participatingMessIds), toJSON(fp.history)
    ]);
  }

  // 15. Copy Groups
  console.log(`📦 Copying ${source.groups.length} roommate groups into MySQL...`);
  for (const g of source.groups) {
    await db.query(`
      INSERT INTO \`groups\` (
        \`id\`, \`name\`, \`inviteCode\`, \`adminUserId\`, \`adminName\`,
        \`messId\`, \`messName\`, \`discountPercent\`, \`createdAt\`,
        \`members\`,\`vacationSyncHistory\`, \`giftedMeals\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`name\` = VALUES(\`name\`),
        \`inviteCode\` = VALUES(\`inviteCode\`),
        \`adminUserId\` = VALUES(\`adminUserId\`),
        \`adminName\` = VALUES(\`adminName\`),
        \`messId\` = VALUES(\`messId\`),
        \`messName\` = VALUES(\`messName\`),
        \`discountPercent\` = VALUES(\`discountPercent\`),
        \`members\` = VALUES(\`members\`),
        \`vacationSyncHistory\` = VALUES(\`vacationSyncHistory\`),
        \`giftedMeals\` = VALUES(\`giftedMeals\`);
    `, [
      g.id, g.name, g.inviteCode, g.adminUserId || null, g.adminName || null,
      g.messId || null, g.messName || null, g.discountPercent || 10, g.createdAt || null,
      toJSON(g.members), toJSON(g.vacationSyncHistory), toJSON(g.giftedMeals)
    ]);
  }

  // 16. Copy Favorites
  console.log(`📦 Copying favorites into MySQL...`);
  for (const fav of source.favorites) {
    const messId = typeof fav === 'string' ? fav : fav.messId;
    if (messId) {
      await db.query(`
        INSERT IGNORE INTO \`favorites\` (\`userId\`, \`messId\`) VALUES ('user_cust_1', ?);
      `, [messId]);
    }
  }

  // 17. Copy Search History
  console.log(`📦 Copying search history into MySQL...`);
  for (const term of source.searchHistory) {
    const termStr = typeof term === 'string' ? term : term.term;
    if (termStr) {
      await db.query(`
        INSERT INTO \`search_history\` (\`userId\`, \`term\`) VALUES ('user_cust_1', ?);
      `, [termStr]);
    }
  }

  // 18. Store full DB backup in db_meta snapshot as well
  await db.query(`
    INSERT INTO \`db_meta\` (\`meta_key\`, \`meta_value\`)
    VALUES ('db_full_snapshot', ?)
    ON DUPLICATE KEY UPDATE \`meta_value\` = VALUES(\`meta_value\`);
  `, [JSON.stringify(source)]);

  console.log('\n=============================================');
  console.log('🎉 ALL DATA COPIED SUCCESSFULLY TO MYSQL!');
  console.log('=============================================\n');

  // Verify Counts
  const tables = [
    'users', 'messes', 'subscriptions', 'trials', 'payments',
    'reviews', 'notifications', 'complaints', 'offers',
    'checkins', 'flexipass_tiers', 'flexipasses', 'groups',
    'favorites', 'search_history', 'db_meta'
  ];

  console.log('📊 Verification of row counts in MySQL:');
  for (const t of tables) {
    const [rows] = await db.query(`SELECT COUNT(*) as count FROM \`${t}\``);
    console.log(`  - Table \`${t}\`: ${rows[0].count} rows`);
  }

  await db.end();
}

if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('✅ Migration script finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateData, DB_CONFIG };
