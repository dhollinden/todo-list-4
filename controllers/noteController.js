const Note = require('../models/note_model');
const async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
const {read, create, update, remove} = require('../modules/crudMondoDB');


// notes home GET
exports.index = function (req, res, next) {

    // retrieve note names for logged in user (for Notes menu)
    const model = 'note';
    const criteria = {'user_id': req.user.id};
    const selection = 'name';
    const options = {name: 1};

    read(model, criteria, selection, options)
        .then(function (names) {

            // render page
            const pageContent = {
                title: 'My Notes',
                names: names,
                message: req.query.message,
                authenticated: req.isAuthenticated()
            }
            res.render('notes', pageContent);

        })
        .catch(function (err) {

            if (err) return next(err);

        });

};


// note detail POST (from Notes menu) and GET (after successful note create and update)
exports.note_detail = function(req, res, next) {

    // get note ID from req.body or req.params
    const noteId = req.params.id ? req.params.id : req.body.id;

    // retrieve all notes for logged in user
    const model = 'note';
    const criteria = {'user_id': req.user.id};
    const selection = '';
    const options = {name: 1};

    read(model, criteria, selection, options)
        .then(function (notes) {

            // look for the selected note among the user's notes
            const selectedNote = notes.filter(note => String(note._id) === noteId)

            // if no note is found, redirect with error message
            // possibilities: ID is not valid ObjectId, user does not have note with that ID
            if (selectedNote[0] === null || typeof selectedNote[0] === 'undefined') {
                return res.redirect('/notes?message=invalidId');
            }

            // found note, so render page
            const pageContent = {
                title: 'My Notes: ' + selectedNote[0].name,
                selectedNote: selectedNote[0],
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

            // check if note with same name already exists for this user

            const model = 'note';
            const criteria = {
                'name': req.body.name,
                'user_id': req.user.id
            };

            read(model, criteria)
                .then(function (note_same_name) {

                    // if note with same name exists, render again with error message

                    if (note_same_name[0]) {

                        const pageContent = {
                            title: 'Create Note: Error',
                            note: note,
                            message: 'name_exists',
                            authenticated: req.isAuthenticated()
                        }

                        res.render('note_form', pageContent);

                    }

                    else {

                        // save note

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

    // retrieve note based on ID in URL
    const data = 'note';
    const criteria = {'_id': req.params.id};

    read(data, criteria)
        .then(function (note) {

            // if note with this id is not found, redirect
            if (note[0] === null || typeof note[0] === 'undefined') {
                return res.redirect('/notes?message=invalidId');
            }

            // if note ID is not formed properly, redirect with error message
            if (note[0].error === 'invalidId') {
                return res.redirect('/notes?message=improperId');
            }

            // if note doesn't belong to user, redirect with error message
            if (note[0].user_id !== req.user.id) {
                return res.redirect('/notes?message=not_yours');
            }

            // success, so render page
            const pageContent = {
                title: 'Update Note: ' + note[0].name,
                note: note[0],
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

                    // if note note with same name exists, convert it's ID to string for comparison
                    const found_id = note_same_name[0] ? String(note_same_name[0]._id) : null;

                    // check if note with same name exists, and if it's not the same note that's being updated
                    if (note_same_name[0] && sanitizedNote._id != found_id) {

                        // user has another note with same name, so render page with error message
                        const pageContent = {
                            title: 'Update Note: Error',
                            note: sanitizedNote,
                            message: 'name_exists',
                            authenticated: req.isAuthenticated()
                        }

                        res.render('note_form', pageContent);

                    } else {

                        // note name is unique, so proceed

                        // read note based on ID in req.params and test whether it's valid to update it
                        const model = 'note';
                        const criteria = {'_id': req.params.id};
                        const changes = {
                            name: sanitizedNote.name,
                            body: sanitizedNote.body
                        };

                        read(model, criteria)
                            .then(function (note) {

                                console.log(`inside note_update_post: inside read.then`)

                                // if note was not found, the ID is invalid, so redirect
                                if (note[0] === null) {
                                    return res.redirect('/notes?message=invalidId');
                                }

                                // if note ID is not formed properly, redirect with error message
                                if (note[0].error === 'invalidId') {
                                    return res.redirect('/notes?message=improperId');
                                }

                                // if note doesn't belong to user, redirect
                                if (note[0].user_id !== req.user.id) {
                                    return res.redirect('/notes?message=not_yours');
                                }

                                // all checks are valid, so update note

                                console.log(`inside note_update_post: inside read.then, after all if statements`)

                                update(model, criteria, changes)
                                    .then(function (updated_note) {

                                        // update was successful
                                        // since "update" function does not return a document, redirect to note.url

                                        console.log(`inside note_update_post: inside read.then, inside update.then, note.url = ${note.url}`)

                                        res.redirect(sanitizedNote.url);

                                    });

                            })






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

    // retrieve note based on ID in URL
    const data = 'note';
    const criteria = {'_id': req.params.id};

    read(data, criteria)
        .then(function (note) {

            // if note was not found, the ID is invalid, so redirect
            if (note[0] === null || typeof note[0] === 'undefined') {
                return res.redirect('/notes?message=invalidId');
            }

            // if note ID is not formed properly, redirect with error message
            if (note[0].error === 'invalidId') {
                return res.redirect('/notes?message=improperId');
            }

            // if note doesn't belong to user, redirect with error message
            if (note[0].user_id !== req.user.id) {
                return res.redirect('/notes?message=not_yours');
            }

            // note was found, so render
            const pageContent = {
                title: 'Delete Note: ' + note[0].name,
                note: note[0],
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

    // retrieve note based on ID in req.body and confirm that it's valid to delete it
    const model = 'note';
    const criteria = {'_id': req.body.id};

    read(model, criteria)
        .then(function (note) {

            // if note was not found, the ID is invalid, so redirect
            if (note[0] === null) {
                return res.redirect('/notes?message=invalidId');
            }

            // if note ID is not formed properly, redirect with error message
            if (note[0].error === 'invalidId') {
                return res.redirect('/notes?message=improperId');
            }

            // if note doesn't belong to user, redirect
            if (note[0].user_id !== req.user.id) {
                return res.redirect('/notes?message=not_yours');
            }

            // delete note
            remove(model, criteria)
                .then(function(deleted_note) {

                    res.redirect('/notes?message=note_deleted');

                });

        })
        .catch(function (err) {

            if (err) return next(err);

        });

};