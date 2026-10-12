const { pool } = require('./mysql');

async function createPhase6Tables() {
  console.log('🔄 Creating Phase 6 tables in MySQL...');

  const sqlAnnouncements = `
    CREATE TABLE IF NOT EXISTS \`announcements\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`title\` VARCHAR(255) NOT NULL,
      \`message\` TEXT NOT NULL,
      \`target\` VARCHAR(100) NOT NULL,
      \`targetId\` VARCHAR(100),
      \`targetName\` VARCHAR(255),
      \`createdById\` VARCHAR(100) NOT NULL,
      \`createdByName\` VARCHAR(255) NOT NULL,
      \`createdByRole\` VARCHAR(50) NOT NULL,
      \`messId\` VARCHAR(100),
      \`status\` VARCHAR(50) DEFAULT 'ACTIVE',
      \`createdAt\` VARCHAR(100),
      INDEX \`idx_ann_target\` (\`target\`),
      INDEX \`idx_ann_mess\` (\`messId\`),
      INDEX \`idx_ann_status\` (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await pool.query(sqlAnnouncements);
    console.log('✅ Table `announcements` verified/created.');
    return true;
  } catch (err) {
    console.warn('⚠️ [MySQL] Could not create announcements table:', err.message);
    return false;
  }
}

if (require.main === module) {
  createPhase6Tables().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { createPhase6Tables };
