var express = require('express');
var router = express.Router();

// require controller module
var note_controller = require('../controllers/noteController');

// ROUTES

// GET request for notes home page
router.get('/', note_controller.index);

// POST request for individual note
router.post('/', note_controller.note_detail_post);

// GET request for creating a note
router.get('/create', note_controller.note_create_get);

// POST request for creating a note
router.post('/create', note_controller.note_create_post);

// GET request for updating a note
router.get('/:id/update', note_controller.note_update_get);

// POST request for updating a note
router.post('/:id/update', note_controller.note_update_post);

// GET request for deleting a note
router.get('/:id/delete', note_controller.note_delete_get);

// POST request for deleting a note
router.post('/:id/delete', note_controller.note_delete_post);

// GET request for individual note
router.get('/:id', note_controller.note_detail_get);

module.exports = router;

