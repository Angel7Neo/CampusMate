const express = require('express');
const router = express.Router();
const controller = require('../controllers/studentController');

router.get('/', controller.getAllStudents);
router.post('/', controller.createStudent);
module.exports = router;