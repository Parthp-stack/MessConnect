const { pool } = require('./mysql');

async function createPhase2Tables() {
  console.log('🔄 Creating Phase 2 attendance tables in MySQL...');

  const sqlAuditLogs = `
    CREATE TABLE IF NOT EXISTS \`attendance_audit_logs\` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const sqlSettings = `
    CREATE TABLE IF NOT EXISTS \`attendance_settings\` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await pool.query(sqlAuditLogs);
    console.log('✅ Table `attendance_audit_logs` verified/created.');
    await pool.query(sqlSettings);
    console.log('✅ Table `attendance_settings` verified/created.');

    // Query sample mess
    const [rows] = await pool.query('SELECT id, name, coordinates FROM messes WHERE id = ?', ['mess_1789969020922']);
    console.log('Sample mess coordinates:', rows[0]);

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed creating Phase 2 tables:', err.message);
    process.exit(1);
  }
}

createPhase2Tables();
