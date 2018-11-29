const express = require('express');
const router = express.Router();

// require controller module
const user_controller = require('../controllers/userController');


// ROUTES


// View account
// GET
router.get('/', user_controller.account);


// Delete account
// GET
router.get('/delete/:id', user_controller.account_delete);


// Update email
//GET
router.get('/email', user_controller.account_email_get);
//POST
router.post('/email', user_controller.account_email_post);


// Update password
// GET
router.get('/password', user_controller.account_password_get);
// POST
router.post('/password', user_controller.account_password_post);


module.exports = router;
