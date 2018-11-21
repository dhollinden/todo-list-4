const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

const Note = require('../models/note_model');
const { read, create, update, remove } = require('../modules/' + process.env.DB);
const { getAllNotesForUser, findNoteById, findAnotherNoteWithSameName } = require('../modules/note_functions');


// notes home GET - display menu with all notes
exports.index = (req, res, next) => {

    console.log(`inside notes home GET`)
    console.log(`req.user.id = ${req.user.id}`)


    getAllNotesForUser(req.user.id)

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

        .catch( err => {

            if (err) return next(err);

        });

};


// note detail - display an individual note and menu with all notes
// POST requests from notes menu are routed here
// GET requests from redirects in note_create_post and note_update_post are routed here with note id in params

exports.note_detail = (req, res, next) => {

    // get ID  of requested note

    const requestedNoteId = req.params.id ? req.params.id : req.body.id;

    getAllNotesForUser(req.user.id)

        .then(notes => {

            // if user does not have note with requestedNoteId, redirect

            const requestedNote = findNoteById(notes, requestedNoteId);
            if (!requestedNote) {
                return res.redirect('/notes?message=invalidId');
            }

            // render page with requestedNote

            const pageContent = {

                title: 'My Notes: ' + requestedNote.name,
                selectedNote: requestedNote,
                notes: notes,
                authenticated: req.isAuthenticated()

            }

            res.render('note_detail', pageContent);

        })

        .catch( err => {

            if (err) return next(err);

        });

};


// note create on GET
exports.note_create_get = (req, res, next) => {

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

        const sanitizedNote = new Note(

            {
                name: req.body.name,
                body: req.body.body,
                user_id: req.user.id
            }

        );

        if (!errors.isEmpty()) {

            // validation errors, render form again with sanitized values

            const pageContent = {

                title: 'Create Note: Error',
                note: sanitizedNote,
                errors: errors.array(),
                authenticated: req.isAuthenticated()

            }

            res.render('note_form', pageContent);

        }

        else {

            getAllNotesForUser(req.user.id)

                .then(notes => {

                    // if user has another note with same name, render form again with sanitized values

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

                    // save note, redirect to note detail page

                    const model = 'note';

                    create(model, sanitizedNote)

                        .then(createdNote => {

                            res.redirect(createdNote.url);

                        })

                })

                .catch( err => {

                    if (err) return next(err);

                });

        }
    }
];


// note update on GET
exports.note_update_get = (req, res, next) => {

    // get ID  of requested note

    const requestedNoteId = req.params.id;

    getAllNotesForUser(req.user.id)

        .then(notes => {

            // if user does not have note with requestedNoteId, redirect

            const requestedNote = findNoteById(notes, requestedNoteId);
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

        .catch( err => {

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

        // create a note object with sanitized data ** make sure to use _id of the note being updated **

        const sanitizedNote = new Note(

            {
                name: req.body.name,
                body: req.body.body,
                _id: req.params.id
            }

        );

        if (!errors.isEmpty()) {

            // validation errors, render form again with sanitized values

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

            getAllNotesForUser(req.user.id)

                .then(notes => {

                    // if user does not have note with requestedNoteId, redirect

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

                    // update note with sanitized values, redirect to note detail page

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

                        .then(updated_note => {

                            // redirect to sanitizedNote.url because update does not return a document

                            res.redirect(sanitizedNote.url);

                        });

                })
                .catch( err => {

                    if (err) return next(err);

                });

        }
    }

];


// note delete GET
exports.note_delete_get = (req, res, next) => {

    // get ID  of requested note

    const requestedNoteId = req.params.id;

    getAllNotesForUser(req.user.id)

        .then(notes => {

            // if user does not have note with requestedNoteId, redirect

            const requestedNote = findNoteById(notes, requestedNoteId);
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

        .catch( err => {

            if (err) return next(err);

        });

}


// note delete POST
exports.note_delete_post = (req, res, next) => {

    // get ID  of requested note

    const requestedNoteId = req.body.id;

    getAllNotesForUser(req.user.id)

        .then(notes => {

            // if user does not have note with requestedNoteId, redirect

            const requestedNote = findNoteById(notes, requestedNoteId);
            if (!requestedNote) {
                return res.redirect('/notes?message=invalidId');
            }

            // delete requestedNote, redirect to notes page

            const model = 'note';
            const criteria = {

                '_id': requestedNoteId,
                'user_id': req.user.id

            };

            remove(model, criteria)

                .then(deleted_note => {

                    res.redirect('/notes?message=note_deleted');

                });

        })
        .catch( err => {

            if (err) return next(err);

        });

};