const bcrypt = require("bcrypt");
const db = require("../config/db");
const { sendOtp, verifyOtp } = require("../utils/otpHelper");

// REGISTER
exports.register = async (req, res) => {
  const { first_name, last_name, stud_no, email, phone_number, password } = req.body;

  if (!first_name || !last_name || !stud_no || !email || !phone_number || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO student (first_name, last_name, stud_no, email, phone_number, password) VALUES (?, ?, ?, ?, ?, ?)`;

    db.query(sql, [first_name, last_name, stud_no, email, phone_number, hashedPassword], (err, result) => {
      if (err) {
        console.error("Registration error:", err);
        return res.status(500).json({ message: "Failed to register", error: err.sqlMessage });
      }
      res.status(201).json({ message: "Student registered successfully", studentId: result.insertId });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// LOGIN
exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const sql = "SELECT * FROM student WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("Login DB error:", err);
      return res.status(500).json({ message: "Database error", error: err.sqlMessage });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    try {
      const otp = await sendOtp(user.phone_number);
      console.log(`OTP sent to ${user.phone_number}: ${otp}`); // debugging
      res.status(200).json({ message: "Login successful, OTP sent", phone_number: user.phone_number });
    } catch (error) {
      console.error("OTP sending error:", error);
      res.status(500).json({ message: "Failed to send OTP", error: error.message });
    }
  });
};

// VERIFY OTP
exports.verifyOtp = (req, res) => {
  const { phone_number, otp } = req.body;

  if (!phone_number || !otp) {
    return res.status(400).json({ message: "Phone number and OTP are required" });
  }

  const isValid = verifyOtp(phone_number, otp);

  if (!isValid) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  res.status(200).json({ message: "OTP verified successfully" });
};

