const Note = require('../models/note_model');
const async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');


// notes home page GET
exports.index = function (req, res, next) {

    // populate the "select a note" menu with notes names
    // where user_id matches logged in user
    Note.find({'user_id': req.user.id})
        .select()
        .sort({name: 1})
        .exec(function (err, names) {

            if (err) return next(err);
            // success, so render page
            const pageContent = {
                title: 'My Notes',
                names: names,
                message: req.query.message,
                authenticated: req.isAuthenticated()
            }
            res.render('notes', pageContent);

        });

};


// individual note on GET (successful note updates redirect here)
exports.note_detail_get = function(req, res, next) {

    async.parallel({

        // retrieve note names for menu
        names: function (callback) {
            Note.find({'user_id': req.user.id}).select('name').sort({name: 1}).exec(callback);
        },

        // retrieve details for individual note
        note: function (callback) {
            Note.findById(req.params.id, callback);
        }

    }, function (err, results) {

        if (err) return next(err);

        if (results.note === null) { // No results
            const err = new Error('Note not found');
            err.status = 404;
            return next(err);
        }

        // if note doesn't belong to user, redirect
        if (results.note.user_id !== req.user.id) {
            return res.redirect('/notes?message=invalid');
        }

        // valid note belongs to user, so render page
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

    // retrieve note names for menu and details for individual note
    async.parallel({
        names: function (callback) {
            Note.find({'user_id': req.user.id}).select('name').sort({name: 1}).exec(callback);
        },
        note: function (callback) {
            Note.findById(req.body.id, callback);
        }
    }, function (err, results) {
        if (err) return next(err);
        if (results.note===null) { // No results
            const err = new Error('Note not found');
            err.status = 404;
            return next(err);
        }
        // if note doesn't belong to user, redirect
        if (results.note.user_id !== req.user.id) {
            return res.redirect('/notes?message=invalid');
        }

        // success, so render page
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


// note create on POST
exports.note_create_post = [

    // validate that note name field is not empty (note body may be empty)
    // --> what about > 100 characters?
    body('name', 'Please enter a name for the note.').isLength({min: 1}).trim(),

    // sanitize note name and body
    sanitizeBody('name').trim().escape(),
    sanitizeBody('body').trim().escape(),

    // process validated and sanitized request
    (req, res, next) => {

        // extract any validation errors
        const errors = validationResult(req);

        // create a note object with sanitized data
        console.log(`req.user._id = ${req.user.id}`);
        const note = new Note(
            {
                name: req.body.name,
                body: req.body.body,
                user_id: req.user.id
            }
        );

        if (!errors.isEmpty()) {
            // there are validation errors, so render form again with sanitized values and error messages
            const pageContent = {
                title: 'Create Note: Error',
                note: note,
                errors: errors.array(),
                authenticated: req.isAuthenticated()
            }
            res.render('note_form', pageContent);
        }
        else {
            // form data is valid, check if note with same name already exists
            Note.findOne({'name': req.body.name, 'user_id': req.user.id}).exec(function(err, found_note) {
                if (err) return next(err);
                if (found_note) {
                    // note with same name exists, so re-render form with message
                    const pageContent = {
                        title: 'Create Note: Error',
                        note: note,
                        message: 'name_exists',
                        authenticated: req.isAuthenticated()
                    }
                    res.render('note_form', pageContent);
                } else {
                    note.save(function(err) {
                        console.log(`note.user_id = ${note.user_id}`);
                        if (err) { return next(err); }
                        // note was saved, so redirect to it's detail page
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
        if (note === null) { // no results
            const err = new Error('Note not found');
            err.status = 404;
            return next(err);
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

    // validate that note name field is not empty (note body may be empty)
    body('name', 'Name is required').isLength({min: 1}).trim(),

    // sanitize note name and body fields
    sanitizeBody('name').trim().escape(),
    sanitizeBody('body').trim().escape(),

    // process validated and sanitized request
    (req, res, next) => {

        // extract any validation errors
        const errors = validationResult(req);

        // create a note object with sanitized data ** and the id of the existing note being updated **
        const note = new Note(
            {
                name: req.body.name,
                body: req.body.body,
                _id: req.params.id
            }
        );

        if (!errors.isEmpty()) {
            // there are validation errors, so render form again with sanitized values and error messages
            const pageContent = {
                title: 'Update Note: Error',
                note: note,
                errors: errors.array(),
                authenticated: req.isAuthenticated()
            }
            res.render('note_form', pageContent);
        }
        else {

            // form data is valid
            // check if note with same name already exists
            Note.findOne({'name': req.body.name, 'user_id': req.user.id}).exec(function(err, found_note) {

                if (err) return next(err);

                // if we find a note with the same name, and its id differs from our note.id...
                const found_id = found_note ? String(found_note._id) : null;
                if (found_note && note._id != found_id) {

                    // ... then a note with same name exists, so re-render with error message
                    const pageContent = {
                        title: 'Update Note: Error',
                        note: note,
                        message: 'name_exists',
                        authenticated: req.isAuthenticated()
                    }
                    res.render('note_form', pageContent);

                } else {

                    // there is no other note with this name, so update in db
                    Note.findByIdAndUpdate(req.params.id, note, {}, function (err,updated_note) {

                        if (err) { return next(err); }

                        // update succeeded, so redirect to detail page for the updated note
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

        // if note does not exist, redirect to home page
        console.log(`note = ${note} and typeof note = ${typeof note}`)
        console.log(`note === null evaluates as ${note === null}`);
        if (note === null) { return res.redirect('/notes?message=invalid'); }

        // successful, so render
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
        // success, so redirect to home page
        res.redirect('/notes?message=note_deleted');
    });

};