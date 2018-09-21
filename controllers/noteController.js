const Note = require('../models/note_model');
const async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');


// notes home GET
exports.index = function (req, res, next) {

    // populate menu with notes where user_id matches logged in user
    Note.find({'user_id': req.user.id})
        .select('name')
        .sort({name: 1})
        .exec(function (err, names) {

            if (err) return next(err);

            // render page
            const pageContent = {
                title: 'My Notes',
                names: names,
                message: req.query.message,
                authenticated: req.isAuthenticated()
            }
            res.render('notes', pageContent);

        });

};


// note detail GET (successful note updates redirect here)
exports.note_detail_get = function(req, res, next) {

    async.parallel({

        // retrieve note names for menu
        names: function (callback) {
            Note.find({'user_id': req.user.id})
                .select('name')
                .sort({name: 1})
                .exec(callback);
        },

        // retrieve details for individual note
        note: function (callback) {
            Note.findById(req.params.id, callback);
        }

    }, function (err, results) {

        if (err) return next(err);

        // return an error if there are no results
        if (results.note === null) {
            return res.redirect('/notes?message=invalid');
        }

        // return an error if note doesn't belong to user
        if (results.note.user_id !== req.user.id) {
            return res.redirect('/notes?message=not_yours');
        }

        // note is valid and belongs to user, so render page
        const pageContent = {
            title: 'My Notes: ' + results.note.name,
            note: results.note,
            names: results.names,
            authenticated: req.isAuthenticated()
        }
        res.render('note_detail', pageContent);

    });

};


// individual note on POST (from notes menu)
exports.note_detail_post = function (req, res, next) {

    async.parallel({

        // retrieve note names for menu
        names: function (callback) {
            Note.find({'user_id': req.user.id})
                .select('name')
                .sort({name: 1})
                .exec(callback);
        },

        // retrieve details for individual note
        note: function (callback) {
            Note.findById(req.body.id, callback);
        }

    }, function (err, results) {

        if (err) return next(err);

        // return an error if there are no results
        if (results.note === null) {
            return res.redirect('/notes?message=invalid');
        }

        // return an error if note doesn't belong to user
        if (results.note.user_id !== req.user.id) {
            return res.redirect('/notes?message=not_yours');
        }

        // note is valid and belongs to user, so render page
        const pageContent = {
            title: 'My Notes: ' + results.note.name,
            note: results.note,
            names: results.names,
            authenticated: req.isAuthenticated()
        }
        res.render('note_detail', pageContent);

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