const express = require('express');
const router = express.Router();

// require controller module
const login_controller = require('../controllers/loginController');

// ROUTES

/* GET home page. */
router.get('/', function(req, res) {
    res.redirect('/notes');
});

// GET request for login page
router.get('/login', login_controller.login_get);

// POST request for login page
router.post('/login', login_controller.login_post)

module.exports = router;
