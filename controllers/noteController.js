const Note = require('../models/note_model');
const async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

const {read} = require('../modules/crudMondoDB');

// notes home GET
exports.index = function (req, res, next) {

    // retrieve notes where user_id matches logged in user (for Notes menu)
    const data = 'note';
    const criteria = {'user_id': req.user.id};
    const selection = 'name';
    const options = {name: 1};
    read(data, criteria, selection, options)
        .then(function (names) {

            console.log(`inside notes home GET, reading db for Notes menu`)
            Object.keys(names).forEach(key => { console.log(`key = ${key}, value = ${names[key]}`) });

            // render page
            const pageContent = {
                title: 'My Notes',
                names: names,
                message: req.query.message,
                authenticated: req.isAuthenticated()
            }
            res.render('notes', pageContent);

        }, function (err) {

            if (err) return next(err);

        });

};


// note detail POST (from menu) and GET (from note updates)
exports.note_detail = function(req, res, next) {

    let data, criteria, selection, options;

    // POST: note ID is in body; GET: note ID is in params
    const noteId = req.params.id ? req.params.id : req.body.id;

    // retrieve notes where user_id matches logged in user (for Notes menu)
    data = 'note';
    criteria = {'user_id': req.user.id};
    selection = 'name';
    options = {name: 1};

    read(data, criteria, selection, options)
    .then(function (names) {

        console.log(`inside note detail POST, reading db for Notes menu`)
        Object.keys(names).forEach(key => { console.log(`key = ${key}, value = ${names[key]}`) });

        // retrieve details for individual note specified in req.body
        data = 'note';
        criteria = {'_id': noteId};

        read(data, criteria)
        .then(function (note) {

            console.log(`inside note detail POST, reading db for individual note`)
            Object.keys(note).forEach(key => { console.log(`key = ${key}, value = ${note[key]}`) });

            // return an error if there are no results
            if (note[0] === null) {
                return res.redirect('/notes?message=invalid');
            }

            console.log(`note[0].user_id = ${note[0].user_id}`)
            console.log(`req.user.id = ${req.user.id}`)
            // return an error if note doesn't belong to user
            if (note[0].user_id !== req.user.id) {
                return res.redirect('/notes?message=not_yours');
            }

            // note is valid and belongs to user, so render page
            const pageContent = {
                title: 'My Notes: ' + note[0].name,
                note: note[0],
                names: names,
                authenticated: req.isAuthenticated()
            }
            res.render('note_detail', pageContent);

        });

    }, function (err) {

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

            data = 'note';
            criteria = {
                'name': req.body.name,
                'user_id': req.user.id
            };
            read(data, criteria)
                .then(function (note_same_name) {

                    // if note with same name exists, render again with error message

                    console.log(`inside note_create_POST: note_same_name = ${note_same_name}`)
                    console.log(`inside note_create_POST: Object.getPrototypeOf(note_same_name) === Array.prototype = ${Object.getPrototypeOf(note_same_name) === Array.prototype}`)
                    if (note_same_name[0]) {

                        console.log(`inside note_create_POST: inside IF statement: note = ${note} `)

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
                        note.save(function(err) {

                            if (err) { return next(err); }

                            // save was successful, redirect to detail page for note
                            res.redirect(note.url);
                        })

                    }


                }, function (err) {

                    if (err) return next(err);

                });

/*
            Note.findOne({'name': req.body.name, 'user_id': req.user.id}).exec(function(err, note_same_name) {

                if (err) return next(err);

                if (note_same_name) {

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

                    // save note
                    note.save(function(err) {

                        if (err) { return next(err); }

                        // save was successful, redirect to detail page for note
                        res.redirect(note.url);
                    })

                }
            })
*/


        }
    }
];


// note update on GET
exports.note_update_get = function (req, res, next) {

    Note.findById(req.params.id).exec(function(err, note) {

        if (err) return next(err);

        // if note with this id is not found
        if (note === null) {
            return res.redirect('/notes?message=invalid');
        }

        // success, so render page
        const pageContent = {
            title: 'Update Note: ' + note.name,
            note: note,
            authenticated: req.isAuthenticated()
        }
        res.render('note_form', pageContent);
    })

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
        const note = new Note(
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
                note: note,
                errors: errors.array(),
                authenticated: req.isAuthenticated()
            }
            res.render('note_form', pageContent);

        }

        else {

            // check if note with same name already exists for this user
            Note.findOne({'name': req.body.name, 'user_id': req.user.id}).exec(function(err, found_note) {

                if (err) return next(err);

                const found_id = found_note ? String(found_note._id) : null;

                // is note with same name is found, check if its id differs from id of note being updated
                if (found_note && note._id != found_id) {

                    // another note with same name exists, render page with error message
                    const pageContent = {
                        title: 'Update Note: Error',
                        note: note,
                        message: 'name_exists',
                        authenticated: req.isAuthenticated()
                    }
                    res.render('note_form', pageContent);

                } else {

                    // update note
                    Note.findByIdAndUpdate(req.params.id, note, {}, function (err, updated_note) {

                        if (err) { return next(err); }

                        // update was successful, redirect to detail page for updated note
                        res.redirect(updated_note.url);

                    });
                }
            })
        }
    }

];


// note delete on GET
exports.note_delete_get = function (req, res, next) {

    Note.findById(req.params.id).exec(function(err, note) {

        if (err) return next(err);

        // if note does not exist, redirect to notes home page
        if (note === null) {
            return res.redirect('/notes?message=invalid');
        }

        // note exists, so render
        const pageContent = {
            title: 'Delete Note: ' + note.name,
            note: note,
            authenticated: req.isAuthenticated()
        }
        res.render('note_delete', pageContent);

    })

}


// note delete on POST
exports.note_delete_post = function (req, res, next) {

    // assume note id is valid
    Note.findByIdAndRemove(req.body.id, function (err) {

        if (err) return next(err);

        // delete was successful, redirect to notes home page
        res.redirect('/notes?message=note_deleted');

    });

};