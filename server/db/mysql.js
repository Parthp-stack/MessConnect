const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'messconnectproject',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ...(sslConfig ? { ssl: sslConfig } : {})
};

const pool = mysql.createPool(DB_CONFIG);

async function testConnection() {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    console.log(`🐬 [MySQL] Successfully connected to database: "${DB_CONFIG.database}" on ${DB_CONFIG.host}:${DB_CONFIG.port} (SSL: ${sslConfig ? 'ACTIVE' : 'OFF'})`);
    return true;
  } catch (err) {
    console.error(`❌ [MySQL] Connection failed for database "${DB_CONFIG.database}":`, err.message);
    return false;
  }
}

// Helper to stringify JSON fields safely
const toJSON = (val) => (val !== undefined && val !== null ? JSON.stringify(val) : null);

// Helper to safely parse JSON if it comes back as string
const parseJSON = (val, fallback = null) => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
};

async function loadAllFromMySQL() {
  try {
    const [usersRaw] = await pool.query('SELECT * FROM `users`');
    const [messesRaw] = await pool.query('SELECT * FROM `messes`');
    const [subsRaw] = await pool.query('SELECT * FROM `subscriptions`');
    const [trialsRaw] = await pool.query('SELECT * FROM `trials`');
    const [paymentsRaw] = await pool.query('SELECT * FROM `payments`');
    const [reviewsRaw] = await pool.query('SELECT * FROM `reviews`');
    const [notifsRaw] = await pool.query('SELECT * FROM `notifications` ORDER BY `createdAt` DESC');
    const [complaintsRaw] = await pool.query('SELECT * FROM `complaints`');
    const [offersRaw] = await pool.query('SELECT * FROM `offers`');
    const [checkinsRaw] = await pool.query('SELECT * FROM `checkins`');
    const [tiersRaw] = await pool.query('SELECT * FROM `flexipass_tiers`');
    const [flexipassesRaw] = await pool.query('SELECT * FROM `flexipasses`');
    const [groupsRaw] = await pool.query('SELECT * FROM `groups`');
    const [favsRaw] = await pool.query('SELECT messId FROM `favorites`');
    const [historyRaw] = await pool.query('SELECT term FROM `search_history`');

    const users = usersRaw.map(u => ({
      ...u,
      preferences: parseJSON(u.preferences, {}),
      documents: parseJSON(u.documents, {}),
      verified: Boolean(u.verified)
    }));

    const messes = messesRaw.map(m => ({
      ...m,
      rating: parseFloat(m.rating) || 5.0,
      isPureVeg: Boolean(m.isPureVeg),
      hasVeg: Boolean(m.hasVeg),
      hasNonVeg: Boolean(m.hasNonVeg),
      trialAvailable: Boolean(m.trialAvailable),
      verified: Boolean(m.verified),
      featured: Boolean(m.featured),
      coordinates: parseJSON(m.coordinates, { lat: 18.5204, lng: 73.8567 }),
      gallery: parseJSON(m.gallery, []),
      timings: parseJSON(m.timings, {}),
      features: parseJSON(m.features, []),
      plans: parseJSON(m.plans, []),
      menuToday: parseJSON(m.menuToday, {}),
      weeklyMenu: parseJSON(m.weeklyMenu, {}),
      documents: parseJSON(m.documents, {})
    }));

    const subscriptions = subsRaw.map(s => ({
      ...s,
      meals: parseJSON(s.meals, ['Lunch', 'Dinner']),
      pauses: parseJSON(s.pauses, [])
    }));

    const trials = trialsRaw.map(t => ({ ...t }));
    const payments = paymentsRaw.map(p => ({ ...p }));
    const reviews = reviewsRaw.map(r => ({
      ...r,
      ratingsBreakdown: parseJSON(r.ratingsBreakdown, {})
    }));
    const notifications = notifsRaw.map(n => ({
      ...n,
      broadcast: Boolean(n.broadcast),
      read: Boolean(n.read)
    }));
    const complaints = complaintsRaw.map(c => ({ ...c }));
    const offers = offersRaw.map(o => ({ ...o }));
    const checkins = checkinsRaw.map(ch => ({ ...ch }));

    const flexipassTiers = tiersRaw.map(t => ({
      ...t,
      participatingMessIds: parseJSON(t.participatingMessIds, [])
    }));

    const flexipasses = flexipassesRaw.map(f => ({
      ...f,
      participatingMessIds: parseJSON(f.participatingMessIds, []),
      history: parseJSON(f.history, [])
    }));

    const groups = groupsRaw.map(g => ({
      ...g,
      members: parseJSON(g.members, []),
      vacationSyncHistory: parseJSON(g.vacationSyncHistory, []),
      giftedMeals: parseJSON(g.giftedMeals, [])
    }));

    const favorites = favsRaw.map(f => f.messId);
    const searchHistory = historyRaw.map(h => h.term);

    let attendanceSessionsRaw = [];
    let attendanceRaw = [];
    let attendanceAuditLogsRaw = [];
    let attendanceSettingsRaw = [];
    try {
      const [sess] = await pool.query('SELECT * FROM `attendance_sessions` ORDER BY `createdAt` DESC');
      attendanceSessionsRaw = sess;
      const [att] = await pool.query('SELECT * FROM `attendance` ORDER BY `createdAt` DESC');
      attendanceRaw = att;
      const [audit] = await pool.query('SELECT * FROM `attendance_audit_logs` ORDER BY `createdAt` DESC LIMIT 500');
      attendanceAuditLogsRaw = audit;
      const [settings] = await pool.query('SELECT * FROM `attendance_settings`');
      attendanceSettingsRaw = settings;
    } catch (attErr) {
      console.warn('⚠️ [MySQL] Attendance tables query notice:', attErr.message);
    }

    let announcementsRaw = [];
    try {
      const [anns] = await pool.query('SELECT * FROM `announcements` ORDER BY `createdAt` DESC');
      announcementsRaw = anns;
    } catch (annErr) {
      console.warn('⚠️ [MySQL] Announcements query notice:', annErr.message);
    }

    const attendanceSessions = attendanceSessionsRaw.map(s => ({ ...s }));
    const attendance = attendanceRaw.map(a => ({ ...a }));
    const attendanceAuditLogs = attendanceAuditLogsRaw.map(al => ({
      ...al,
      details: parseJSON(al.details, {})
    }));
    const attendanceSettings = attendanceSettingsRaw.map(st => ({
      ...st,
      locationVerificationEnabled: Boolean(st.locationVerificationEnabled),
      autoRotateQrEnabled: Boolean(st.autoRotateQrEnabled)
    }));
    const announcements = announcementsRaw.map(a => ({ ...a }));

    return {
      users,
      messes,
      subscriptions,
      trials,
      payments,
      reviews,
      notifications,
      complaints,
      offers,
      checkins,
      flexipassTiers,
      flexipasses,
      groups,
      favorites,
      searchHistory,
      attendanceSessions,
      attendance,
      attendanceAuditLogs,
      attendanceSettings,
      announcements
    };
  } catch (err) {
    console.error('❌ [MySQL] Error loading data from MySQL:', err.message);
    throw err;
  }
}

// Asynchronously persist entire data snapshot or specific updates to MySQL
async function saveAllToMySQL(data) {
  if (!data) return;
  try {
    // 1. Users
    if (data.users && Array.isArray(data.users)) {
      for (const u of data.users) {
        await pool.query(`
          INSERT INTO \`users\` (
            \`id\`, \`name\`, \`email\`, \`phone\`, \`password\`, \`role\`, \`avatar\`, \`college\`,
            \`location\`, \`diet\`, \`department\`, \`preferences\`, \`verificationStatus\`, \`verified\`,
            \`reviewNotes\`, \`documents\`, \`messId\`, \`messName\`, \`createdAt\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`), \`email\` = VALUES(\`email\`), \`phone\` = VALUES(\`phone\`),
            \`password\` = VALUES(\`password\`), \`role\` = VALUES(\`role\`), \`avatar\` = VALUES(\`avatar\`),
            \`college\` = VALUES(\`college\`), \`location\` = VALUES(\`location\`), \`diet\` = VALUES(\`diet\`),
            \`department\` = VALUES(\`department\`), \`preferences\` = VALUES(\`preferences\`),
            \`verificationStatus\` = VALUES(\`verificationStatus\`), \`verified\` = VALUES(\`verified\`),
            \`reviewNotes\` = VALUES(\`reviewNotes\`), \`documents\` = VALUES(\`documents\`),
            \`messId\` = VALUES(\`messId\`), \`messName\` = VALUES(\`messName\`);
        `, [
          u.id, u.name || '', u.email || null, u.phone || null, u.password || 'password123', u.role || 'CUSTOMER',
          u.avatar || null, u.college || null, u.location || null, u.diet || null, u.department || null,
          toJSON(u.preferences), u.verificationStatus || null, Boolean(u.verified),
          u.reviewNotes || null, toJSON(u.documents), u.messId || null, u.messName || null, u.createdAt || null
        ]);
      }
    }

    // 2. Messes
    if (data.messes && Array.isArray(data.messes)) {
      for (const m of data.messes) {
        await pool.query(`
          INSERT INTO \`messes\` (
            \`id\`, \`ownerId\`, \`name\`, \`tagline\`, \`description\`, \`area\`, \`city\`, \`pincode\`,
            \`address\`, \`coordinates\`, \`distance\`, \`rating\`, \`reviewCount\`, \`pricePerMonth\`,
            \`isPureVeg\`, \`hasVeg\`, \`hasNonVeg\`, \`trialAvailable\`, \`trialPrice\`, \`verified\`,
            \`featured\`, \`status\`, \`verificationStatus\`, \`reviewNotes\`, \`documents\`, \`phone\`,
            \`whatsapp\`, \`email\`, \`coverImage\`, \`gallery\`, \`timings\`, \`features\`, \`plans\`,
            \`menuToday\`, \`weeklyMenu\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`ownerId\` = VALUES(\`ownerId\`), \`name\` = VALUES(\`name\`), \`tagline\` = VALUES(\`tagline\`),
            \`description\` = VALUES(\`description\`), \`area\` = VALUES(\`area\`), \`city\` = VALUES(\`city\`),
            \`pincode\` = VALUES(\`pincode\`), \`address\` = VALUES(\`address\`), \`coordinates\` = VALUES(\`coordinates\`),
            \`distance\` = VALUES(\`distance\`), \`rating\` = VALUES(\`rating\`), \`reviewCount\` = VALUES(\`reviewCount\`),
            \`pricePerMonth\` = VALUES(\`pricePerMonth\`), \`isPureVeg\` = VALUES(\`isPureVeg\`),
            \`hasVeg\` = VALUES(\`hasVeg\`), \`hasNonVeg\` = VALUES(\`hasNonVeg\`),
            \`trialAvailable\` = VALUES(\`trialAvailable\`), \`trialPrice\` = VALUES(\`trialPrice\`),
            \`verified\` = VALUES(\`verified\`), \`featured\` = VALUES(\`featured\`), \`status\` = VALUES(\`status\`),
            \`verificationStatus\` = VALUES(\`verificationStatus\`), \`reviewNotes\` = VALUES(\`reviewNotes\`),
            \`documents\` = VALUES(\`documents\`), \`phone\` = VALUES(\`phone\`), \`whatsapp\` = VALUES(\`whatsapp\`),
            \`email\` = VALUES(\`email\`), \`coverImage\` = VALUES(\`coverImage\`), \`gallery\` = VALUES(\`gallery\`),
            \`timings\` = VALUES(\`timings\`), \`features\` = VALUES(\`features\`), \`plans\` = VALUES(\`plans\`),
            \`menuToday\` = VALUES(\`menuToday\`), \`weeklyMenu\` = VALUES(\`weeklyMenu\`);
        `, [
          m.id, m.ownerId || null, m.name || '', m.tagline || null, m.description || null, m.area || null, m.city || null, m.pincode || null,
          m.address || null, toJSON(m.coordinates), m.distance || null, m.rating || 5.0, m.reviewCount || 0, m.pricePerMonth || 3200,
          Boolean(m.isPureVeg), Boolean(m.hasVeg), Boolean(m.hasNonVeg), Boolean(m.trialAvailable), m.trialPrice || 70, Boolean(m.verified),
          Boolean(m.featured), m.status || 'ACTIVE', m.verificationStatus || 'APPROVED', m.reviewNotes || null, toJSON(m.documents), m.phone || null,
          m.whatsapp || null, m.email || null, m.coverImage || null, toJSON(m.gallery), toJSON(m.timings), toJSON(m.features), toJSON(m.plans),
          toJSON(m.menuToday), toJSON(m.weeklyMenu)
        ]);
      }
    }

    // 3. Subscriptions
    if (data.subscriptions && Array.isArray(data.subscriptions)) {
      for (const s of data.subscriptions) {
        await pool.query(`
          INSERT INTO \`subscriptions\` (
            \`id\`, \`userId\`, \`userName\`, \`messId\`, \`messName\`, \`planId\`, \`planName\`, \`paymentId\`,
            \`amount\`, \`meals\`, \`status\`, \`totalDays\`, \`activeDays\`, \`pausedDays\`,
            \`remainingDays\`, \`startDate\`, \`endDate\`, \`pauses\`, \`cancelReason\`, \`cancelledAt\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`userId\` = VALUES(\`userId\`), \`userName\` = VALUES(\`userName\`), \`messId\` = VALUES(\`messId\`),
            \`messName\` = VALUES(\`messName\`), \`planId\` = VALUES(\`planId\`), \`planName\` = VALUES(\`planName\`),
            \`paymentId\` = VALUES(\`paymentId\`), \`amount\` = VALUES(\`amount\`), \`meals\` = VALUES(\`meals\`),
            \`status\` = VALUES(\`status\`), \`totalDays\` = VALUES(\`totalDays\`), \`activeDays\` = VALUES(\`activeDays\`),
            \`pausedDays\` = VALUES(\`pausedDays\`), \`remainingDays\` = VALUES(\`remainingDays\`),
            \`startDate\` = VALUES(\`startDate\`), \`endDate\` = VALUES(\`endDate\`), \`pauses\` = VALUES(\`pauses\`),
            \`cancelReason\` = VALUES(\`cancelReason\`), \`cancelledAt\` = VALUES(\`cancelledAt\`);
        `, [
          s.id, s.userId, s.userName || null, s.messId, s.messName || null, s.planId || null, s.planName || null, s.paymentId || null,
          s.amount || 0, toJSON(s.meals), s.status || 'ACTIVE', s.totalDays || 30, s.activeDays || 0, s.pausedDays || 0,
          s.remainingDays || 30, s.startDate || null, s.endDate || null, toJSON(s.pauses), s.cancelReason || null, s.cancelledAt || null
        ]);
      }
    }

    // 4. Trials
    if (data.trials && Array.isArray(data.trials)) {
      for (const t of data.trials) {
        await pool.query(`
          INSERT INTO \`trials\` (
            \`id\`, \`userId\`, \`userName\`, \`userPhone\`, \`messId\`, \`messName\`,
            \`mealType\`, \`date\`, \`price\`, \`status\`, \`createdAt\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`userId\` = VALUES(\`userId\`), \`userName\` = VALUES(\`userName\`),
            \`userPhone\` = VALUES(\`userPhone\`), \`messId\` = VALUES(\`messId\`),
            \`messName\` = VALUES(\`messName\`), \`mealType\` = VALUES(\`mealType\`),
            \`date\` = VALUES(\`date\`), \`price\` = VALUES(\`price\`), \`status\` = VALUES(\`status\`);
        `, [
          t.id, t.userId, t.userName || null, t.userPhone || null, t.messId, t.messName || null,
          t.mealType || null, t.date || null, t.price || 70, t.status || 'PENDING', t.createdAt || null
        ]);
      }
    }

    // 5. Payments
    if (data.payments && Array.isArray(data.payments)) {
      for (const p of data.payments) {
        await pool.query(`
          INSERT INTO \`payments\` (
            \`id\`, \`orderId\`, \`paymentId\`, \`signature\`, \`userId\`, \`messId\`, \`subscriptionId\`, \`trialId\`,
            \`amount\`, \`currency\`, \`method\`, \`status\`, \`receiptNumber\`, \`description\`, \`date\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`orderId\` = VALUES(\`orderId\`), \`paymentId\` = VALUES(\`paymentId\`), \`signature\` = VALUES(\`signature\`),
            \`userId\` = VALUES(\`userId\`), \`messId\` = VALUES(\`messId\`),
            \`subscriptionId\` = VALUES(\`subscriptionId\`), \`trialId\` = VALUES(\`trialId\`),
            \`amount\` = VALUES(\`amount\`), \`currency\` = VALUES(\`currency\`), \`method\` = VALUES(\`method\`),
            \`status\` = VALUES(\`status\`), \`receiptNumber\` = VALUES(\`receiptNumber\`),
            \`description\` = VALUES(\`description\`), \`date\` = VALUES(\`date\`);
        `, [
          p.id, p.orderId || null, p.paymentId || null, p.signature || null, p.userId, p.messId || null,
          p.subscriptionId || null, p.trialId || null, p.amount || 0, p.currency || 'INR',
          p.method || null, p.status || 'SUCCESS', p.receiptNumber || null, p.description || null, p.date || null
        ]);
      }
    }

    // 6. Reviews
    if (data.reviews && Array.isArray(data.reviews)) {
      for (const r of data.reviews) {
        await pool.query(`
          INSERT INTO \`reviews\` (
            \`id\`, \`messId\`, \`userId\`, \`userName\`, \`userAvatar\`, \`rating\`,
            \`ratingsBreakdown\`, \`comment\`, \`date\`, \`ownerResponse\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`messId\` = VALUES(\`messId\`), \`userId\` = VALUES(\`userId\`),
            \`userName\` = VALUES(\`userName\`), \`userAvatar\` = VALUES(\`userAvatar\`),
            \`rating\` = VALUES(\`rating\`), \`ratingsBreakdown\` = VALUES(\`ratingsBreakdown\`),
            \`comment\` = VALUES(\`comment\`), \`date\` = VALUES(\`date\`),
            \`ownerResponse\` = VALUES(\`ownerResponse\`);
        `, [
          r.id, r.messId, r.userId, r.userName || null, r.userAvatar || null, r.rating || 5,
          toJSON(r.ratingsBreakdown), r.comment || null, r.date || null, r.ownerResponse || null
        ]);
      }
    }

    // 7. Notifications
    if (data.notifications && Array.isArray(data.notifications)) {
      for (const n of data.notifications) {
        await pool.query(`
          INSERT INTO \`notifications\` (
            \`id\`, \`userId\`, \`broadcast\`, \`channel\`, \`title\`, \`message\`,
            \`read\`, \`type\`, \`time\`, \`timestamp\`, \`createdAt\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`read\` = VALUES(\`read\`), \`title\` = VALUES(\`title\`), \`message\` = VALUES(\`message\`);
        `, [
          n.id, n.userId || null, Boolean(n.broadcast), n.channel || 'System', n.title || '', n.message || '',
          Boolean(n.read), n.type || null, n.time || null, n.timestamp || null, n.createdAt || null
        ]);
      }
    }

    // 8. Complaints
    if (data.complaints && Array.isArray(data.complaints)) {
      for (const c of data.complaints) {
        await pool.query(`
          INSERT INTO \`complaints\` (
            \`id\`, \`userId\`, \`userName\`, \`messId\`, \`messName\`, \`category\`,
            \`subject\`, \`description\`, \`status\`, \`adminNotes\`, \`date\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`userId\` = VALUES(\`userId\`), \`userName\` = VALUES(\`userName\`),
            \`messId\` = VALUES(\`messId\`), \`messName\` = VALUES(\`messName\`),
            \`category\` = VALUES(\`category\`), \`subject\` = VALUES(\`subject\`),
            \`description\` = VALUES(\`description\`), \`status\` = VALUES(\`status\`),
            \`adminNotes\` = VALUES(\`adminNotes\`), \`date\` = VALUES(\`date\`);
        `, [
          c.id, c.userId, c.userName || null, c.messId || null, c.messName || null, c.category || null,
          c.subject || null, c.description || null, c.status || 'OPEN', c.adminNotes || null, c.date || null
        ]);
      }
    }

    // 9. Offers
    if (data.offers && Array.isArray(data.offers)) {
      for (const o of data.offers) {
        await pool.query(`
          INSERT INTO \`offers\` (
            \`id\`, \`messId\`, \`messName\`, \`title\`, \`description\`,
            \`discountPercent\`, \`validUntil\`, \`code\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`messId\` = VALUES(\`messId\`), \`messName\` = VALUES(\`messName\`),
            \`title\` = VALUES(\`title\`), \`description\` = VALUES(\`description\`),
            \`discountPercent\` = VALUES(\`discountPercent\`), \`validUntil\` = VALUES(\`validUntil\`),
            \`code\` = VALUES(\`code\`);
        `, [
          o.id, o.messId, o.messName || null, o.title || '', o.description || null,
          o.discountPercent || null, o.validUntil || null, o.code || null
        ]);
      }
    }

    // 10. Checkins
    if (data.checkins && Array.isArray(data.checkins)) {
      for (const ch of data.checkins) {
        await pool.query(`
          INSERT INTO \`checkins\` (
            \`id\`, \`subscriptionId\`, \`flexipassId\`, \`userId\`, \`userName\`,
            \`userPhone\`, \`messId\`, \`messName\`, \`mealType\`, \`date\`,
            \`time\`, \`token4Digit\`, \`qrCodePayload\`, \`status\`, \`method\`, \`planName\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`status\` = VALUES(\`status\`);
        `, [
          ch.id, ch.subscriptionId || null, ch.flexipassId || null, ch.userId, ch.userName || null,
          ch.userPhone || null, ch.messId, ch.messName || null, ch.mealType || null, ch.date || null,
          ch.time || null, ch.token4Digit || null, ch.qrCodePayload || null, ch.status || 'VALID',
          ch.method || 'QR_SCAN', ch.planName || null
        ]);
      }
    }

    // 11. Flexipasses
    if (data.flexipasses && Array.isArray(data.flexipasses)) {
      for (const fp of data.flexipasses) {
        await pool.query(`
          INSERT INTO \`flexipasses\` (
            \`id\`, \`userId\`, \`userName\`, \`tierId\`, \`tierName\`,
            \`totalCredits\`, \`creditsRemaining\`, \`creditsUsed\`, \`startDate\`,
            \`validUntil\`, \`status\`, \`clusterName\`, \`participatingMessIds\`, \`history\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`userId\` = VALUES(\`userId\`), \`userName\` = VALUES(\`userName\`),
            \`tierId\` = VALUES(\`tierId\`), \`tierName\` = VALUES(\`tierName\`),
            \`totalCredits\` = VALUES(\`totalCredits\`), \`creditsRemaining\` = VALUES(\`creditsRemaining\`),
            \`creditsUsed\` = VALUES(\`creditsUsed\`), \`startDate\` = VALUES(\`startDate\`),
            \`validUntil\` = VALUES(\`validUntil\`), \`status\` = VALUES(\`status\`),
            \`clusterName\` = VALUES(\`clusterName\`), \`participatingMessIds\` = VALUES(\`participatingMessIds\`),
            \`history\` = VALUES(\`history\`);
        `, [
          fp.id, fp.userId, fp.userName || null, fp.tierId || null, fp.tierName || null,
          fp.totalCredits || 0, fp.creditsRemaining || 0, fp.creditsUsed || 0, fp.startDate || null,
          fp.validUntil || null, fp.status || 'ACTIVE', fp.clusterName || null,
          toJSON(fp.participatingMessIds), toJSON(fp.history)
        ]);
      }
    }

    // 12. Groups
    if (data.groups && Array.isArray(data.groups)) {
      for (const g of data.groups) {
        await pool.query(`
          INSERT INTO \`groups\` (
            \`id\`, \`name\`, \`inviteCode\`, \`adminUserId\`, \`adminName\`,
            \`messId\`, \`messName\`, \`discountPercent\`, \`createdAt\`,
            \`members\`,\`vacationSyncHistory\`, \`giftedMeals\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`), \`inviteCode\` = VALUES(\`inviteCode\`),
            \`adminUserId\` = VALUES(\`adminUserId\`), \`adminName\` = VALUES(\`adminName\`),
            \`messId\` = VALUES(\`messId\`), \`messName\` = VALUES(\`messName\`),
            \`discountPercent\` = VALUES(\`discountPercent\`), \`members\` = VALUES(\`members\`),
            \`vacationSyncHistory\` = VALUES(\`vacationSyncHistory\`), \`giftedMeals\` = VALUES(\`giftedMeals\`);
        `, [
          g.id, g.name, g.inviteCode, g.adminUserId || null, g.adminName || null,
          g.messId || null, g.messName || null, g.discountPercent || 10, g.createdAt || null,
          toJSON(g.members), toJSON(g.vacationSyncHistory), toJSON(g.giftedMeals)
        ]);
      }
    }

    // 13. Attendance Sessions
    if (data.attendanceSessions && Array.isArray(data.attendanceSessions)) {
      for (const s of data.attendanceSessions) {
        await pool.query(`
          INSERT INTO \`attendance_sessions\` (
            \`id\`, \`messId\`, \`messName\`, \`sessionType\`, \`date\`,
            \`token\`, \`expiresAt\`, \`status\`, \`createdById\`, \`createdAt\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`status\` = VALUES(\`status\`),
            \`expiresAt\` = VALUES(\`expiresAt\`);
        `, [
          s.id, s.messId, s.messName || null, s.sessionType, s.date,
          s.token, s.expiresAt, s.status || 'ACTIVE', s.createdById || null, s.createdAt || null
        ]);
      }
    }

    // 14. Attendance Records
    if (data.attendance && Array.isArray(data.attendance)) {
      for (const a of data.attendance) {
        await pool.query(`
          INSERT INTO \`attendance\` (
            \`id\`, \`studentId\`, \`studentName\`, \`messId\`, \`messName\`,
            \`sessionId\`, \`attendanceDate\`, \`sessionType\`, \`status\`, \`markedAt\`, \`createdAt\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`status\` = VALUES(\`status\`),
            \`markedAt\` = VALUES(\`markedAt\`);
        `, [
          a.id, a.studentId, a.studentName || null, a.messId, a.messName || null,
          a.sessionId || null, a.attendanceDate, a.sessionType, a.status || 'PRESENT',
          a.markedAt || null, a.createdAt || null
        ]);
      }
    }

    // 15. Attendance Audit Logs
    if (data.attendanceAuditLogs && Array.isArray(data.attendanceAuditLogs)) {
      for (const al of data.attendanceAuditLogs.slice(0, 500)) {
        await pool.query(`
          INSERT INTO \`attendance_audit_logs\` (
            \`id\`, \`userId\`, \`userName\`, \`role\`, \`action\`, \`messId\`, \`messName\`,
            \`studentId\`, \`studentName\`, \`sessionType\`, \`date\`, \`time\`, \`reason\`,
            \`oldStatus\`, \`newStatus\`, \`details\`, \`ipAddress\`, \`createdAt\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`details\` = VALUES(\`details\`);
        `, [
          al.id, al.userId || null, al.userName || null, al.role || null, al.action,
          al.messId, al.messName || null, al.studentId || null, al.studentName || null,
          al.sessionType || null, al.date || null, al.time || null, al.reason || null,
          al.oldStatus || null, al.newStatus || null, toJSON(al.details), al.ipAddress || null,
          al.createdAt || null
        ]);
      }
    }

    // 16. Attendance Settings
    if (data.attendanceSettings && Array.isArray(data.attendanceSettings)) {
      for (const st of data.attendanceSettings) {
        await pool.query(`
          INSERT INTO \`attendance_settings\` (
            \`messId\`, \`breakfastStart\`, \`breakfastEnd\`, \`lunchStart\`, \`lunchEnd\`,
            \`dinnerStart\`, \`dinnerEnd\`, \`lowAttendanceThreshold\`, \`locationVerificationEnabled\`,
            \`radiusMeters\`, \`autoRotateQrEnabled\`, \`qrRotationIntervalMinutes\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`breakfastStart\` = VALUES(\`breakfastStart\`),
            \`breakfastEnd\` = VALUES(\`breakfastEnd\`),
            \`lunchStart\` = VALUES(\`lunchStart\`),
            \`lunchEnd\` = VALUES(\`lunchEnd\`),
            \`dinnerStart\` = VALUES(\`dinnerStart\`),
            \`dinnerEnd\` = VALUES(\`dinnerEnd\`),
            \`lowAttendanceThreshold\` = VALUES(\`lowAttendanceThreshold\`),
            \`locationVerificationEnabled\` = VALUES(\`locationVerificationEnabled\`),
            \`radiusMeters\` = VALUES(\`radiusMeters\`),
            \`autoRotateQrEnabled\` = VALUES(\`autoRotateQrEnabled\`),
            \`qrRotationIntervalMinutes\` = VALUES(\`qrRotationIntervalMinutes\`);
        `, [
          st.messId, st.breakfastStart || '07:30', st.breakfastEnd || '10:30',
          st.lunchStart || '12:00', st.lunchEnd || '15:30', st.dinnerStart || '19:30',
          st.dinnerEnd || '22:30', st.lowAttendanceThreshold || 75,
          Boolean(st.locationVerificationEnabled), st.radiusMeters || 100,
          Boolean(st.autoRotateQrEnabled), st.qrRotationIntervalMinutes || 5
        ]);
      }
    }

    // 16. Announcements
    if (data.announcements && Array.isArray(data.announcements)) {
      for (const ann of data.announcements) {
        await pool.query(`
          INSERT INTO \`announcements\` (
            \`id\`, \`title\`, \`message\`, \`target\`, \`targetId\`, \`targetName\`,
            \`createdById\`, \`createdByName\`, \`createdByRole\`, \`messId\`, \`status\`, \`createdAt\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`title\` = VALUES(\`title\`),
            \`message\` = VALUES(\`message\`),
            \`target\` = VALUES(\`target\`),
            \`status\` = VALUES(\`status\`);
        `, [
          ann.id, ann.title || '', ann.message || '', ann.target || 'ALL_STUDENTS',
          ann.targetId || null, ann.targetName || null, ann.createdById || '',
          ann.createdByName || '', ann.createdByRole || 'ADMIN', ann.messId || null,
          ann.status || 'ACTIVE', ann.createdAt || null
        ]);
      }
    }

    // 17. Metadata snapshot backup
    await pool.query(`
      INSERT INTO \`db_meta\` (\`meta_key\`, \`meta_value\`)
      VALUES ('db_full_snapshot', ?)
      ON DUPLICATE KEY UPDATE \`meta_value\` = VALUES(\`meta_value\`);
    `, [JSON.stringify(data)]);

  } catch (err) {
    console.error('⚠️ [MySQL] Warning during saveAllToMySQL:', err.message);
  }
}

// Clear all dummy data from MySQL tables while preserving SuperAdmin
async function clearAllMySQLData(keepAdmin = true) {
  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    const tables = [
      'messes',
      'subscriptions',
      'trials',
      'payments',
      'reviews',
      'notifications',
      'complaints',
      'offers',
      'checkins',
      'flexipass_tiers',
      'flexipasses',
      'groups',
      'favorites',
      'search_history',
      'attendance_sessions',
      'attendance',
      'attendance_audit_logs',
      'attendance_settings',
      'announcements'
    ];

    for (const table of tables) {
      await conn.query(`TRUNCATE TABLE \`${table}\``);
    }

    if (keepAdmin) {
      await conn.query("DELETE FROM `users` WHERE `role` != 'ADMIN'");
      await conn.query(`
        INSERT INTO \`users\` (
          \`id\`, \`name\`, \`email\`, \`phone\`, \`password\`, \`role\`, \`avatar\`, \`department\`, \`verified\`
        ) VALUES (
          'user_admin_1', 'Admin', 'admin@messconnect.in', '', 'password123', 'ADMIN',
          '',
          'Platform Administration', 1
        )
        ON DUPLICATE KEY UPDATE \`role\` = 'ADMIN', \`email\` = 'admin@messconnect.in', \`name\` = 'Admin';
      `);
    } else {
      await conn.query('TRUNCATE TABLE `users`');
    }

    // Clean snapshot metadata
    await conn.query(`DELETE FROM \`db_meta\` WHERE \`meta_key\` = 'db_full_snapshot'`).catch(() => {});

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ [MySQL] All dummy database data emptied from MySQL tables successfully.');
    return true;
  } catch (err) {
    console.error('❌ [MySQL] Error clearing MySQL data:', err.message);
    throw err;
  } finally {
    conn.release();
  }
}

// Whitelist of allowed database tables
const ALLOWED_TABLES = [
  'users',
  'messes',
  'subscriptions',
  'trials',
  'payments',
  'reviews',
  'notifications',
  'complaints',
  'offers',
  'checkins',
  'flexipass_tiers',
  'flexipasses',
  'groups',
  'favorites',
  'search_history',
  'attendance_sessions',
  'attendance',
  'attendance_audit_logs',
  'attendance_settings',
  'announcements',
  'db_meta'
];

async function getLiveTablesSummary() {
  const [tableRows] = await pool.query('SHOW TABLES');
  const dbNameKey = Object.keys(tableRows[0] || {})[0] || 'Tables_in_messconnectproject';
  
  const summaries = [];
  let totalRows = 0;

  for (const t of tableRows) {
    const tableName = t[dbNameKey];
    if (!tableName) continue;
    try {
      const [countRes] = await pool.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
      const [colRes] = await pool.query(`DESCRIBE \`${tableName}\``);
      const rowCount = countRes[0]?.cnt || 0;
      totalRows += rowCount;

      const { TABLE_METADATA } = require('./exportUtils');
      const meta = TABLE_METADATA[tableName] || {
        displayName: tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/_/g, ' '),
        description: `Database table for ${tableName}`,
        primaryKey: 'id',
        icon: 'FileText'
      };

      summaries.push({
        tableName,
        displayName: meta.displayName,
        description: meta.description,
        icon: meta.icon,
        primaryKey: meta.primaryKey,
        rowCount,
        columnCount: colRes.length,
        columns: colRes.map(c => ({
          field: c.Field,
          type: c.Type,
          null: c.Null === 'YES',
          key: c.Key,
          default: c.Default
        }))
      });
    } catch (err) {
      console.warn(`[MySQL] Summary error for ${tableName}:`, err.message);
    }
  }

  return {
    database: DB_CONFIG.database,
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    tableCount: summaries.length,
    totalRows,
    tables: summaries,
    timestamp: new Date().toISOString()
  };
}

async function getLiveTable(tableName) {
  if (!ALLOWED_TABLES.includes(tableName)) {
    throw new Error(`Invalid table name: "${tableName}". Must be one of: ${ALLOWED_TABLES.join(', ')}`);
  }

  const [rows] = await pool.query(`SELECT * FROM \`${tableName}\``);
  const [columns] = await pool.query(`DESCRIBE \`${tableName}\``);

  const { TABLE_METADATA } = require('./exportUtils');
  const meta = TABLE_METADATA[tableName] || {
    displayName: tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/_/g, ' '),
    description: `Database table for ${tableName}`,
    primaryKey: 'id'
  };

  return {
    tableName,
    displayName: meta.displayName,
    description: meta.description,
    primaryKey: meta.primaryKey,
    count: rows.length,
    columns: columns.map(c => ({
      field: c.Field,
      type: c.Type,
      null: c.Null === 'YES',
      key: c.Key,
      default: c.Default
    })),
    rows
  };
}

async function getAllTablesData() {
  const allData = {};
  for (const tableName of ALLOWED_TABLES) {
    try {
      const [rows] = await pool.query(`SELECT * FROM \`${tableName}\``);
      allData[tableName] = rows;
    } catch (e) {
      allData[tableName] = [];
    }
  }
  return allData;
}

module.exports = {
  pool,
  testConnection,
  loadAllFromMySQL,
  saveAllToMySQL,
  clearAllMySQLData,
  getLiveTablesSummary,
  getLiveTable,
  getAllTablesData,
  ALLOWED_TABLES,
  DB_CONFIG
};
