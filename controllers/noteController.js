const Note = require('../models/note_model');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
const {read, create, update, remove} = require('../modules/crudMondoDB');
const { getUsersNotes, selectedNoteExists, findNoteById, findAnotherNoteWithSameName } = require('../modules/note_functions');


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

            getUsersNotes(req.user.id)
                .then(function (notes) {

                    // if user has another note with same name, render again with error message and sanitized values

                    const anotherNoteWithSameName = findAnotherNoteWithSameName(notes, null, req.body.name);
                    if (anotherNoteWithSameName) {
                        const pageContent = {
                            title: 'Create Note: Error',
                            selectedNote: note,
                            message: 'name_exists',
                            authenticated: req.isAuthenticated()
                        }

                        return res.render('note_form', pageContent);
                    }

                    // note name is unique, so save note

                    const model = 'note';
                    create(model, note)
                        .then(function(note) {

                            // save was successful, redirect to detail page for note
                            res.redirect(note.url);

                        })

                })
                .catch(function (err) {

                    if (err) return next(err);

                });

        }
    }
];


// note update on GET
exports.note_update_get = function (req, res, next) {

    // get ID  of requested note
    const requestedNoteId = req.params.id;

    getUsersNotes(req.user.id)
        .then(function (notes) {

            const requestedNote = findNoteById(notes, requestedNoteId);

            // if requestedNote wasn't found, redirect
            if (!requestedNote) {
                return res.redirect('/notes?message=invalidId');
            }

            // render page
            const pageContent = {
                title: 'Update Note: ' + requestedNote.name,
                selectedNote: requestedNote,
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

            // get ID  of requested note
            const requestedNoteId = req.params.id;

            getUsersNotes(req.user.id)
                .then(function (notes) {

                    // if requestedNote wasn't found, redirect
                    const requestedNote = findNoteById(notes, requestedNoteId);
                    if (!requestedNote) {
                        return res.redirect('/notes?message=invalidId');
                    }

                    // if user has another note with same name, render again with error message and sanitized values
                    const anotherNoteWithSameName = findAnotherNoteWithSameName(notes, requestedNoteId, req.body.name);
                    if (anotherNoteWithSameName) {
                        const pageContent = {
                            title: 'Update Note: Error',
                            selectedNote: sanitizedNote,
                            message: 'name_exists',
                            authenticated: req.isAuthenticated()
                        }
                        return res.render('note_form', pageContent);
                    }

                    // update note with sanitized values
                    const model = 'note';
                    const criteria = {
                        '_id': requestedNoteId,
                        'user_id': req.user.id
                    };
                    const changes = {
                        name: sanitizedNote.name,
                        body: sanitizedNote.body
                    };

                    update(model, criteria, changes)
                        .then(function (updated_note) {

                            // redirect to sanitizedNote.url because update does not return a document
                            res.redirect(sanitizedNote.url);

                        });

                })
                .catch(function (err) {

                    if (err) return next(err);

                });

        }
    }

];


// note delete GET
exports.note_delete_get = function (req, res, next) {

    // get ID  of requested note
    const requestedNoteId = req.params.id;

    getUsersNotes(req.user.id)
        .then(function (notes) {

            const requestedNote = findNoteById(notes, requestedNoteId);

            // if requestedNote wasn't found, redirect
            if (!requestedNote) {
                return res.redirect('/notes?message=invalidId');
            }

            // render page
            const pageContent = {
                title: 'Delete Note: ' + requestedNote.name,
                selectedNote: requestedNote,
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

    // get ID  of requested note
    const requestedNoteId = req.body.id;

    getUsersNotes(req.user.id)
        .then(function (notes) {

            const requestedNote = findNoteById(notes, requestedNoteId);

            // if requestedNote wasn't found, redirect
            if (!requestedNote) {
                return res.redirect('/notes?message=invalidId');
            }

            // delete requestedNote
            const model = 'note';
            const criteria = {
                '_id': requestedNoteId,
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