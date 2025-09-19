require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const twilio = require('twilio');

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001',  'https://campusmate-production-017f.up.railway.app', 'null'],
  credentials: true
}));

app.use(bodyParser.json());
app.use(express.json());

// ---------------- DATABASE ----------------
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root', 
  password: process.env.DB_PASS || 'N@nSep05',
  database: process.env.DB_NAME || 'campusmate'
});

db.connect(err => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log('MySQL Connected!');
});

// ---------------- TWILIO SETUP ----------------
// Enhanced OTP store with timestamps for expiry
const otpStore = {}; // { email: { otp: string, timestamp: number } }

// Create single Twilio client instance (only if credentials exist)
let client = null;
if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
  client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Helper function to format South African phone numbers
function formatPhoneNumber(phone) {
  // Remove all non-digit characters first
  let cleaned = phone.replace(/\D/g, '');
  
  console.log("Cleaning phone:", phone, "->", cleaned);
  
  // Handle South African numbers
  if (cleaned.startsWith('27')) {
    // Already has country code
    return '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    // Replace leading 0 with +27
    return '+27' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    // Assume it's missing the leading 0
    return '+27' + cleaned;
  } else {
    // Default to adding +27
    return '+27' + cleaned;
  }
}

// Helper function to check OTP expiry (5 minutes)
function isOTPValid(email) {
  const otpData = otpStore[email];
  if (!otpData) return false;
  
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  return (now - otpData.timestamp) < fiveMinutes;
}

// ---------------- AUTHENTICATION ROUTES ----------------

// REGISTER
app.post('/register', async (req, res) => {
  const { first_name, last_name, stud_no, email, phone_number, password } = req.body;
  
  console.log('Registration attempt:', { first_name, last_name, stud_no, email, phone_number });
  
  if (!first_name || !last_name || !stud_no || !email || !phone_number || !password) {
    return res.status(400).json({ message: "All required fields must be filled" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const sql = `
      INSERT INTO student 
      (first_name, last_name, stud_no, email, phone_number, password) 
      VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.query(sql, [first_name, last_name, stud_no, email, phone_number, hashedPassword], (err, result) => {
      if (err) {
        console.error("Registration error:", err);
        
        let message = "Failed to register";
        if (err.code === 'ER_DUP_ENTRY') {
          message = "Email or Student Number already exists";
        } else if (err.code === 'ER_NO_SUCH_TABLE') {
          message = "Database table 'student' not found";
        }
        
        return res.status(500).json({ 
          message,
          error: err.sqlMessage || err.message,
          code: err.code 
        });
      }
      
      console.log('Student registered successfully:', result.insertId);
      res.status(201).json({ 
        message: "Student registered successfully",
        studentId: result.insertId 
      });
    });
  } catch (error) {
    console.error("Hashing error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// LOGIN
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt for:', email);
  console.log('Password provided:', password); // Remove this after debugging
  
  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const sql = 'SELECT * FROM student WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("Login query error:", err);
      return res.status(500).json({ message: "Login failed", error: err.sqlMessage });
    }

    if (results.length === 0) {
      console.log('No user found with email:', email);
      return res.status(401).json({ message: "Student not found" });
    }

    const student = results[0];
    console.log('Found user:', student.email);
    console.log('Stored hash:', student.password); // Remove this after debugging

    try {
      const match = await bcrypt.compare(password, student.password);
      console.log('Password match:', match); // Remove this after debugging
      
      if (!match) {
        return res.status(401).json({ message: "Incorrect password" });
      }

      console.log('Login successful for:', email);
      res.status(200).json({
        message: "Login successful",
        student: {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          stud_no: student.stud_no,
          email: student.email,
          phone_number: student.phone_number
        }
      });
    } catch (error) {
      console.error("Password compare error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });
});

// SEND OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  
  console.log('OTP request for email:', email);
  
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  // Check if Twilio is properly configured
  if (!client) {
    console.error('Twilio not properly configured');
    return res.status(500).json({ message: "SMS service not configured" });
  }

  try {
    const results = await new Promise((resolve, reject) => {
      db.query('SELECT phone_number FROM student WHERE email = ?', [email], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    if (results.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    let phone = results[0].phone_number;
    console.log("Original phone from DB:", phone);

    // Format phone number properly
    const formattedPhone = formatPhoneNumber(phone);
    console.log("Formatted phone:", formattedPhone);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Generated OTP:", otp);

    // Store OTP with timestamp
    otpStore[email] = {
      otp: otp,
      timestamp: Date.now()
    };

    // Send SMS using the client instance
    const message = await client.messages.create({
      body: `Your CampusMate verification code is: ${otp}. This code will expire in 5 minutes.`,
      from: process.env.TWILIO_PHONE,
      to: formattedPhone
    });

    console.log(`SMS sent successfully! SID: ${message.sid}`);
    console.log(`Sent to: ${formattedPhone}`);
    
    // Return success with masked phone number
    const maskedPhone = formattedPhone.substring(0, 6) + "****" + formattedPhone.substring(formattedPhone.length - 3);
    
    res.json({ 
      message: "OTP sent successfully",
      phone: maskedPhone,
      sid: message.sid
    });

  } catch (error) {
    console.error("Send OTP error:", error);
    
    // Handle database errors
    if (error.code && error.code.startsWith('ER_')) {
      return res.status(500).json({ message: "Database error", error: error.sqlMessage });
    }
    
    // Handle Twilio errors
    let errorMessage = "Failed to send OTP";
    if (error.code === 21614) {
      errorMessage = "Invalid phone number format";
    } else if (error.code === 21608) {
      errorMessage = "Phone number not verified with Twilio (Trial account limitation)";
    } else if (error.code === 20003) {
      errorMessage = "Authentication Error - Check Twilio credentials";
    } else if (error.code === 21211) {
      errorMessage = "Invalid 'To' phone number";
    } else if (error.code === 21606) {
      errorMessage = "Phone number not valid for SMS";
    }
    
    res.status(500).json({ 
      message: errorMessage, 
      error: error.message,
      twilioCode: error.code,
      moreInfo: error.moreInfo
    });
  }
});

// VERIFY OTP
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  
  console.log('OTP verification attempt:', { email, otp });
  
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const otpData = otpStore[email];
  
  if (!otpData) {
    console.log('No OTP found for email:', email);
    return res.status(400).json({ message: "No OTP found for this email. Please request a new one." });
  }

  // Check if OTP is expired
  if (!isOTPValid(email)) {
    console.log('OTP expired for email:', email);
    delete otpStore[email]; // Clean up expired OTP
    return res.status(400).json({ message: "OTP has expired. Please request a new one." });
  }

  // Verify OTP
  if (otpData.otp === otp.toString()) {
    // Clear the OTP after successful verification
    delete otpStore[email];
    console.log('OTP verified successfully for:', email);
    return res.json({ message: "OTP verified successfully" });
  } else {
    console.log('Invalid OTP attempt for:', email, 'Expected:', otpData.otp, 'Got:', otp);
    return res.status(400).json({ message: "Invalid OTP" });
  }
});

// RESET PASSWORD
app.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  
  if (!email || !newPassword) {
    return res.status(400).json({ message: "Email and new password are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    db.query(
      'UPDATE student SET password = ? WHERE email = ?',
      [hashedPassword, email],
      (err, result) => {
        if (err) {
          console.error("Password reset error:", err);
          return res.status(500).json({ message: "Failed to reset password" });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Student not found" });
        }
        
        console.log('Password reset successful for:', email);
        res.json({ message: "Password reset successfully" });
      }
    );
  } catch (error) {
    console.error("Password hashing error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- BOOKING ROUTES ----------------

// BOOKING
app.post('/booking', async (req, res) => {
  const { date, time, service, studentNumber } = req.body;

  if (!date || !time || !service || !studentNumber) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Using callback version to match the existing pattern
    db.query(
      `INSERT INTO booking (booking_date, booking_time, booking_status, stud_no, employee_id)
       VALUES (?, ?, ?, ?, ?)`,
      [date, time, service, studentNumber, 1],
      (err, result) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Database error' });
        }

        res.json({
          message: 'Booking saved successfully!',
          booking_no: result.insertId
        });
      }
    );
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET BOOKINGS - Additional endpoint to retrieve bookings for a student
app.get('/bookings/:studentNumber', (req, res) => {
  const { studentNumber } = req.params;
  
  const sql = 'SELECT * FROM booking WHERE stud_no = ? ORDER BY booking_date DESC, booking_time DESC';
  
  db.query(sql, [studentNumber], (err, results) => {
    if (err) {
      console.error('Get bookings error:', err);
      return res.status(500).json({ message: 'Failed to retrieve bookings' });
    }
    
    res.json({
      message: 'Bookings retrieved successfully',
      bookings: results
    });
  });
});

// ---------------- UTILITY ROUTES ----------------

// TEST SMS ROUTE (for debugging)
app.post('/test-sms', async (req, res) => {
  const { phone } = req.body;
  
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  if (!client) {
    return res.status(500).json({ error: "SMS service not configured" });
  }

  try {
    const formattedPhone = formatPhoneNumber(phone);
    console.log('Testing SMS to:', formattedPhone);
    
    const message = await client.messages.create({
      body: 'Test SMS from CampusMate - Your setup is working!',
      from: process.env.TWILIO_PHONE,
      to: formattedPhone
    });
    
    console.log('Test SMS sent:', message.sid);
    res.json({ 
      success: true, 
      sid: message.sid,
      to: formattedPhone,
      status: message.status
    });
  } catch (error) {
    console.error('Test SMS failed:', error);
    res.status(500).json({ 
      error: error.message, 
      code: error.code,
      moreInfo: error.moreInfo 
    });
  }
});

// HEALTH CHECK
app.get('/health', (req, res) => {
  const twilioConfigured = !!(process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE);
  
  res.json({ 
    status: 'OK', 
    message: 'CampusMate server is running',
    timestamp: new Date().toISOString(),
    twilioConfigured,
    activeOTPs: Object.keys(otpStore).length,
    features: ['authentication', 'booking', 'otp', 'password-reset']
  });
});

// ---------------- BACKGROUND TASKS ----------------

// OTP CLEANUP - Clean up expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  Object.keys(otpStore).forEach(email => {
    const otpData = otpStore[email];
    if (otpData && (now - otpData.timestamp) > fiveMinutes) {
      console.log('Cleaning up expired OTP for:', email);
      delete otpStore[email];
    }
  });
  
  // Also clean up if store gets too large
  if (Object.keys(otpStore).length > 100) {
    console.log('OTP store getting large, cleaning up oldest entries');
    const entries = Object.entries(otpStore);
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    entries.slice(0, 50).forEach(([email]) => delete otpStore[email]);
  }
}, 5 * 60 * 1000);

// ---------------- ERROR HANDLERS ----------------

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    availableRoutes: [
      'POST /register',
      'POST /login',
      'POST /send-otp',
      'POST /verify-otp',
      'POST /reset-password',
      'POST /booking',
      'GET /bookings/:studentNumber',
      'POST /test-sms',
      'GET /health'
    ]
  });
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`🚀 CampusMate Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 Network access: http://${HOST}:${PORT}`);
  
  // Database connection status
  console.log(`🗄️  Database: ${process.env.DB_NAME || 'campusmate'} on ${process.env.DB_HOST || 'localhost'}`);
  
  // Check Twilio configuration on startup
  if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE) {
    console.warn('⚠️  WARNING: Twilio credentials not configured properly');
    console.warn('📱 SMS features will be unavailable');
    console.warn('Required environment variables: TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE');
  } else {
    console.log('✅ Twilio configured with SID:', process.env.TWILIO_SID.substring(0, 8) + '...');
    console.log('📱 Twilio phone number:', process.env.TWILIO_PHONE);
  }
  
  console.log('\n📋 Available Features:');
  console.log('   - Student Registration & Authentication');
  console.log('   - OTP Verification & Password Reset');
  console.log('   - Appointment Booking System');
  console.log('   - Health Check & Testing Endpoints');
  
  console.log('\n🔗 API Endpoints:');
  console.log('   Authentication: /register, /login, /send-otp, /verify-otp, /reset-password');
  console.log('   Booking: /booking, /bookings/:studentNumber');
  console.log('   Utility: /health, /test-sms');
  
  console.log('\n✨ CampusMate Backend ready for connections!');
});