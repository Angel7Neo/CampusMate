const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'campusmate_user',   // ✅ must exist in MySQL
  password: 'your_password', // ✅ must be correct
  database: 'campusmate'
});

db.connect(err => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    return;
  }
  console.log("✅ Connected to MySQL!");
});

module.exports = db;

