const { pool } = require('./mysql');

async function createAttendanceTables() {
  console.log('🔄 Creating attendance tables in MySQL...');

  const sqlSessions = `
    CREATE TABLE IF NOT EXISTS \`attendance_sessions\` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const sqlAttendance = `
    CREATE TABLE IF NOT EXISTS \`attendance\` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await pool.query(sqlSessions);
    console.log('✅ Table `attendance_sessions` verified/created.');
    await pool.query(sqlAttendance);
    console.log('✅ Table `attendance` verified/created.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed creating attendance tables:', err.message);
    process.exit(1);
  }
}

createAttendanceTables();
