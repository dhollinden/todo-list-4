const express = require('express');
const router = express.Router();

// require controller module
const login_controller = require('../controllers/loginController');

// ROUTES

// GET request for login page
router.get('/', login_controller.login_get);

// POST request for login page
router.post('/', login_controller.login_post)

module.exports = router;
