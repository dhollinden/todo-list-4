const express = require('express');
const router = express.Router();

// require controller module
const user_controller = require('../controllers/userController');

// ROUTES

/* GET home page. */
router.get('/', user_controller.index);

// GET request for login page
router.get('/login', user_controller.login_get);

// POST request for login page
router.post('/login', user_controller.login_post)

// GET request for signup page
router.get('/signup', user_controller.signup_get);

// POST request for login page
router.post('/signup', user_controller.signup_post)

module.exports = router;
