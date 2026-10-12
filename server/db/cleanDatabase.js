const fs = require('fs');
const path = require('path');
const { clearAllMySQLData, testConnection, DB_CONFIG } = require('./mysql');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'messconnect.db.json');

const CLEAN_BASELINE = {
  users: [
    {
      id: "user_admin_1",
      name: "Admin",
      email: "admin@messconnect.in",
      phone: "",
      password: "password123",
      role: "ADMIN",
      avatar: "",
      department: "Platform Administration",
      verified: true,
      createdAt: new Date().toISOString()
    }
  ],
  messes: [],
  subscriptions: [],
  trials: [],
  payments: [],
  reviews: [],
  notifications: [],
  complaints: [],
  offers: [],
  checkins: [],
  flexipassTiers: [],
  flexipasses: [],
  groups: [],
  favorites: [],
  searchHistory: []
};

async function cleanDatabase() {
  console.log('============================================================');
  console.log('🧹 [MessConnect] Emptying all dummy database records...');
  console.log(`🐬 Database Target: "${DB_CONFIG.database}" on ${DB_CONFIG.host}:${DB_CONFIG.port}`);
  console.log('============================================================\n');

  // 1. Connect and clean MySQL tables
  const isConnected = await testConnection();
  if (!isConnected) {
    throw new Error(`Cannot connect to MySQL database "${DB_CONFIG.database}". Please check MySQL service.`);
  }

  await clearAllMySQLData(true);

  // 2. Clear local file cache
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(CLEAN_BASELINE, null, 2), 'utf8');
  console.log(`✅ [FileCache] Reset ${DB_FILE} to empty real-data baseline.`);

  console.log('\n============================================================');
  console.log('🎉 DATABASE EMPTIED SUCCESSFULLY!');
  console.log('• All dummy students, mess owners, and listings removed.');
  console.log('• All dummy subscriptions, reviews, passes & trials cleared.');
  console.log('• SuperAdmin preserved: admin@messconnect.in / password123');
  console.log('• The platform is now ready for REAL DATA onboarding.');
  console.log('============================================================');
}

if (require.main === module) {
  cleanDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error cleaning database:', err);
      process.exit(1);
    });
}

module.exports = { cleanDatabase, CLEAN_BASELINE };
