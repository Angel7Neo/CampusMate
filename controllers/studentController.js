const db = require('../db');

// Get all students
exports.getAllStudents = (req, res) => {
  db.query("SELECT * FROM students", (err, results) => {
    if (err) {
      console.error("❌ Error fetching students:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
};

// Create new student (signup)
exports.createStudent = (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields required" });
  }

  const sql = "INSERT INTO students (name, email, password) VALUES (?, ?, ?)";
  db.query(sql, [name, email, password], (err, result) => {
    if (err) {
      console.error("❌ Error inserting student:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.status(201).json({ message: "Student created successfully", studentId: result.insertId });
  });
};
