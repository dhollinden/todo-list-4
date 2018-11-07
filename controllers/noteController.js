const Note = require('../models/note_model');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
const {read, create, update, remove} = require('../modules/crudMondoDB');
const { getUsersNotes, selectedNoteExists, findNoteById } = require('../modules/note_functions');


// notes home GET
exports.index = function (req, res, next) {

    getUsersNotes(req.user.id)
        .then(notes => {

            // render page
            const pageContent = {
                title: 'My Notes',
                notes: notes,
                message: req.query.message,
                authenticated: req.isAuthenticated()
            }
            res.render('notes', pageContent);
        })
        .catch(err => {

            if (err) return next(err);

        });

};


// note detail
// POST (choose note from Notes menu)
// GET (redirect here after successfully creating or updating a note)
exports.note_detail = function(req, res, next) {

    // get ID  of requested note
    const requestedNoteId = req.params.id ? req.params.id : req.body.id;

    getUsersNotes(req.user.id)
        .then(function (notes) {

            const requestedNote = findNoteById(notes, requestedNoteId);

            // if requestedNote wasn't found, redirect
            if (!requestedNote) {
                return res.redirect('/notes?message=invalidId');
            }

            // render page
            const pageContent = {
                title: 'My Notes: ' + requestedNote.name,
                selectedNote: requestedNote,
                notes: notes,
                authenticated: req.isAuthenticated()
            }
            res.render('note_detail', pageContent);

        })
        .catch(function (err) {

            if (err) return next(err);

        });

};


// note create on GET
exports.note_create_get = function(req, res, next) {

    const pageContent = {
        title: 'Create Note',
        authenticated: req.isAuthenticated()
    }

    res.render('note_form', pageContent);

};


// note create POST
exports.note_create_post = [

    // validate note name field (note body may be empty)
    body('name', 'Please enter a name for the note.')
        .isLength({min: 1})
        .trim(),

    // sanitize note name and body
    sanitizeBody('name').trim().escape(),
    sanitizeBody('body').trim().escape(),

    // process request
    (req, res, next) => {

        // extract any validation errors
        const errors = validationResult(req);

        // create a note object with sanitized data
        const note = new Note(
            {
                name: req.body.name,
                body: req.body.body,
                user_id: req.user.id
            }
        );

        if (!errors.isEmpty()) {

            // there are validation errors
            // render again with error messages and sanitized note object
            const pageContent = {
                title: 'Create Note: Error',
                note: note,
                errors: errors.array(),
                authenticated: req.isAuthenticated()
            }
            res.render('note_form', pageContent);

        }

        else {

            // query for note with same name for this user

            const model = 'note';
            const criteria = {
                'name': req.body.name,
                'user_id': req.user.id
            };

            read(model, criteria)
                .then(function (note_same_name) {

                    if (note_same_name[0]) {

                        // note with same name exists, render again with error message

                        const pageContent = {
                            title: 'Create Note: Error',
                            note: note,
                            message: 'name_exists',
                            authenticated: req.isAuthenticated()
                        }

                        res.render('note_form', pageContent);

                    }

                    else {

                        // note name is unique, so save note

                        create(model, note)
                            .then(function(note) {

                                // save was successful, redirect to detail page for note
                                res.redirect(note.url);

                            })

                    }

                })
                .catch(function (err) {

                    if (err) return next(err);

                });

        }
    }
];


// note update on GET
exports.note_update_get = function (req, res, next) {

    // get ID  of selected note from req.params
    const selectedNoteId = req.params.id;

    // read all notes for logged in user
    const model = 'note';
    const criteria = {'user_id': req.user.id};
    const selection = '';
    const options = {name: 1};

    read(model, criteria, selection, options)
        .then(function (notes) {

            // look for the selected note among the user's notes
            const selectedNote = notes.filter(note => String(note._id) === selectedNoteId)[0]

            // if selected note is not found, redirect with error message
            if (selectedNote === null || typeof selectedNote === 'undefined') {
                return res.redirect('/notes?message=invalidId');
            }

            // selected note was found, so render page
            const pageContent = {
                title: 'Update Note: ' + selectedNote.name,
                selectedNote: selectedNote,
                authenticated: req.isAuthenticated()
            }

            res.render('note_form', pageContent);

        })
        .catch(function (err) {

            if (err) return next(err);

        });

}

// note update on POST
exports.note_update_post = [

    // validate note name field (note body may be empty)
    body('name', 'Name is required')
        .isLength({min: 1})
        .trim(),

    // sanitize note name and body fields
    sanitizeBody('name').trim().escape(),
    sanitizeBody('body').trim().escape(),

    // process validated and sanitized request
    (req, res, next) => {

        // extract any validation errors
        const errors = validationResult(req);

        // create a note object with sanitized data
        // ** use the id of the existing note being updated **
        const sanitizedNote = new Note(
            {
                name: req.body.name,
                body: req.body.body,
                _id: req.params.id
            }
        );

        if (!errors.isEmpty()) {

            // there are validation errors
            // render again with error messages and sanitized note object with existing note id
            const pageContent = {
                title: 'Update Note: Error',
                note: sanitizedNote,
                errors: errors.array(),
                authenticated: req.isAuthenticated()
            }

            res.render('note_form', pageContent);

        }

        else {

            // check if note with same name already exists for this user

            const model = 'note';
            let criteria = {
                'name': req.body.name,
                'user_id': req.user.id
            };

            read(model, criteria)
                .then(function (note_same_name) {

                    // if note with same name exists, convert it's ID to string for comparison
                    const found_id = note_same_name[0] ? String(note_same_name[0]._id) : null;

                    // check if note with same name exists, and if it's not the same note that's being updated
                    if (note_same_name[0] && sanitizedNote._id != found_id) {

                        // user has another note with same name, so render page with error message
                        const pageContent = {
                            title: 'Update Note: Error',
                            selectedNote: sanitizedNote,
                            message: 'name_exists',
                            authenticated: req.isAuthenticated()
                        }

                        res.render('note_form', pageContent);

                    } else {

                        // note name is unique, so proceed

                        // get ID  of selected note from req.params
                        const selectedNoteId = req.params.id;

                        // read all notes for logged in user
                        const model = 'note';
                        const criteria = {'user_id': req.user.id};
                        const selection = '';
                        const options = {name: 1};

                        read(model, criteria, selection, options)
                            .then(function (notes) {

                                // look for the selected note among the user's notes
                                const selectedNote = notes.filter(note => String(note._id) === selectedNoteId)[0]

                                // if selected note is not found, redirect with error message
                                if (selectedNote === null || typeof selectedNote === 'undefined') {
                                    return res.redirect('/notes?message=invalidId');
                                }

                                // all checks are valid, so update note with sanitized values

                                const changes = {
                                    name: sanitizedNote.name,
                                    body: sanitizedNote.body
                                };
                                const criteria = {
                                    '_id': selectedNoteId,
                                    'user_id': req.user.id
                                };

                                update(model, criteria, changes)
                                    .then(function (updated_note) {

                                        // update was successful, redirect to sanitizedNote.url (update does not return a document)

                                        res.redirect(sanitizedNote.url);

                                    });
                            })
                            .catch(function (err) {

                                if (err) return next(err);

                            });

                    }

                })
                .catch(function (err) {

                    if (err) return next(err);

                });

        }
    }

];


// note delete GET
exports.note_delete_get = function (req, res, next) {

    // get ID  of selected note from req.params
    const selectedNoteId = req.params.id

    // read all notes for logged in user
    const model = 'note';
    const criteria = {'user_id': req.user.id};
    const selection = '';
    const options = {name: 1};

    read(model, criteria, selection, options)
        .then(function (notes) {

            // look for the selected note among the user's notes
            const selectedNote = notes.filter(note => String(note._id) === selectedNoteId)[0]

            // if selected note is not found, redirect with error message
            if (selectedNote === null || typeof selectedNote === 'undefined') {
                return res.redirect('/notes?message=invalidId');
            }

            // selected note was found, so render page
            const pageContent = {
                title: 'Delete Note: ' + selectedNote.name,
                selectedNote: selectedNote,
                authenticated: req.isAuthenticated()
            }

            res.render('note_delete', pageContent);

        })
        .catch(function (err) {

            if (err) return next(err);

        });

}


// note delete POST
exports.note_delete_post = function (req, res, next) {

    // get ID  of selected note from req.body
    const selectedNoteId = req.body.id

    // read all notes for logged in user
    const model = 'note';
    const criteria = {'user_id': req.user.id};
    const selection = '';
    const options = {name: 1};

    read(model, criteria, selection, options)
        .then(function (notes) {

            // look for the selected note among the user's notes
            const selectedNote = notes.filter(note => String(note._id) === selectedNoteId)[0]

            // if selected note is not found, redirect with error message
            if (selectedNote === null || typeof selectedNote === 'undefined') {
                return res.redirect('/notes?message=invalidId');
            }

            // selected note was found, so delete it
            const criteria = {
                '_id': selectedNoteId,
                'user_id': req.user.id
            };

            remove(model, criteria)
                .then(function(deleted_note) {

                    res.redirect('/notes?message=note_deleted');

                });

        })
        .catch(function (err) {

            if (err) return next(err);

        });

};