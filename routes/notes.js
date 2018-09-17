const express = require('express');
const router = express.Router();

// require controller module
const note_controller = require('../controllers/noteController');

// ROUTES


// Notes section GET
router.get('/', note_controller.index);


// Display note POST
router.post('/', note_controller.note_detail_post);


// Create note
// GET
router.get('/create', note_controller.note_create_get);
// POST
router.post('/create', note_controller.note_create_post);


// Update note
// GET
router.get('/:id/update', note_controller.note_update_get);
// POST
router.post('/:id/update', note_controller.note_update_post);


// Delete note
// GET
router.get('/:id/delete', note_controller.note_delete_get);
// POST
router.post('/:id/delete', note_controller.note_delete_post);



// Display note GET
router.get('/:id', note_controller.note_detail_get);


module.exports = router;

