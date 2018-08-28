const express = require('express');
const router = express.Router();

// require controller module
const login_controller = require('../controllers/loginController');

// ROUTES

/* GET home page. */
router.get('/', login_controller.index);

// GET request for login page
router.get('/login', login_controller.login_get);

// POST request for login page
router.post('/login', login_controller.login_post)

// GET request for signup page
router.get('/signup', login_controller.signup_get);

// POST request for login page
router.post('/signup', login_controller.signup_post)

module.exports = router;
