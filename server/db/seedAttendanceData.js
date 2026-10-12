const db = require('./database');
const { pool } = require('./mysql');

async function seedAttendance() {
  console.log('🌱 Seeding realistic attendance history...');
  
  // Wait for MySQL sync if not completed
  await new Promise(r => setTimeout(r, 1000));

  const messes = db.getMesses();
  const targetMess = messes[0] || { id: 'mess_1789969020922', name: 'Kailash Mess' };
  const subs = db.getMessSubscriptions(targetMess.id);

  if (subs.length === 0) {
    console.log('No active subscriptions found for mess', targetMess.id);
    process.exit(0);
  }

  const students = subs.map(s => ({ id: s.userId, name: s.userName || 'Student' }));

  // Seed attendance for 10 Oct, 11 Oct, and 12 Oct
  const sampleSessions = [
    { date: '2026-10-10', sessionType: 'Lunch' },
    { date: '2026-10-10', sessionType: 'Dinner' },
    { date: '2026-10-11', sessionType: 'Breakfast' },
    { date: '2026-10-11', sessionType: 'Lunch' },
    { date: '2026-10-11', sessionType: 'Dinner' },
    { date: '2026-10-12', sessionType: 'Breakfast' }
  ];

  for (const s of sampleSessions) {
    for (const [index, student] of students.entries()) {
      // Create realistic presence: on 11 Oct lunch student #0 was Absent
      const isAbsent = (s.date === '2026-10-11' && s.sessionType === 'Lunch' && index === 0) || (index % 7 === 3);
      const status = isAbsent ? 'ABSENT' : 'PRESENT';
      const markedAt = isAbsent ? '-' : (s.sessionType === 'Breakfast' ? '8:24 AM' : s.sessionType === 'Lunch' ? '1:14 PM' : '8:45 PM');

      const existing = db.findAttendanceRecord({
        studentId: student.id,
        messId: targetMess.id,
        attendanceDate: s.date,
        sessionType: s.sessionType
      });

      if (!existing) {
        db.markAttendance({
          studentId: student.id,
          studentName: student.name,
          messId: targetMess.id,
          messName: targetMess.name,
          sessionId: `sess_${s.date}_${s.sessionType}`,
          attendanceDate: s.date,
          sessionType: s.sessionType,
          status,
          markedAt
        });
      }
    }
  }

  const { saveAllToMySQL } = require('./mysql');
  await saveAllToMySQL(db.data);
  console.log(`✅ Seeded attendance records for ${students.length} students across 6 past sessions.`);
  process.exit(0);
}

seedAttendance().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
