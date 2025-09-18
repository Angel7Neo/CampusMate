const twilio = require("twilio");
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Temporary store for OTPs (use DB or Redis in production)
const otpStore = {};

exports.sendOtp = async (phone_number) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[phone_number] = otp;

  await client.messages.create({
    body: `Your CampusMate OTP is ${otp}`,
    from: process.env.TWILIO_PHONE,
    to: phone_number
  });

  return otp;
};

exports.verifyOtp = (phone_number, otp) => {
  const validOtp = otpStore[phone_number];
  if (otp === validOtp) {
    delete otpStore[phone_number]; // remove OTP after verification
    return true;
  }
  return false;
};

