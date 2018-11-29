const express = require('express');
const router = express.Router();

// require controller module
const user_controller = require('../controllers/userController');


// ROUTES

// home page GET
router.get('/', user_controller.index);


// Signup user
// GET
router.get('/signup', user_controller.signup_get);
// POST
router.post('/signup', user_controller.signup_post);


// Log In user
// GET
router.get('/login', user_controller.login_get);
// POST
router.post('/login', user_controller.login_post);


// Log Out user
// GET
router.get('/logout', user_controller.logout_get);



module.exports = router;
