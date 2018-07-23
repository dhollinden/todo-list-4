const Note = require('../models/note');
const async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// display notes home page
exports.index = function (req, res, next) {

    Note.find().select('name').sort({name: 1}).exec(function (err, names) {
        if (err) { return next(err); }
        // Success, so render
        res.render('index', { title: 'Note List Home', names: names, action: req.query.action } );
    });

};

// display an individual note on GET
exports.note_detail_get = function(req, res, next) {

    async.parallel({
        names: function (callback) {
            Note.find().select('name').sort({name: 1}).exec(callback);
        },
        note: function (callback) {
            Note.findById(req.params.id, callback);
        }
    }, function (err, results) {
        if (err) { return next(err); }
        if (results.note===null) { // No results
            const err = new Error('Note not found');
            err.status = 404;
            return next(err);
        }
        // Success, so render
        res.render('note_detail', { title: 'Note Detail', note: results.note, names: results.names } );

    });

};

// display an individual note on POST
exports.note_detail_post = function (req, res, next) {

    async.parallel({
        names: function (callback) {
            Note.find().select('name').sort({name: 1}).exec(callback);
        },
        note: function (callback) {
            Note.findById(req.body.id, callback);
        }
    }, function (err, results) {
        if (err) { return next(err); }
        if (results.note===null) { // No results
            const err = new Error('Note not found');
            err.status = 404;
            return next(err);
        }
        // Success, so render
        res.render('note_detail', { title: 'Note Detail', note: results.note, names: results.names } );

    });

};

// display note create page on GET
exports.note_create_get = function(req, res, next) {
    res.render('note_form', { title: 'Create Note' });
};

// display note create form on POST
exports.note_create_post = [

    // validate that note name field is not empty (note body may be empty) --> what about > 100 characters?
    body('name', 'Name is required').isLength({min: 1}).trim(),

    // sanitize note name and body fields
    sanitizeBody('name').trim().escape(),
    sanitizeBody('body').trim().escape(),

    // process validated and sanitized request
    (req, res, next) => {

        // extract any validation errors
        const errors = validationResult(req);

        // create a note object with sanitized data
        const note = new Note(
            {
                name: req.body.name,
                body: req.body.body
            }
        );

        if (!errors.isEmpty()) {
            // there are validation errors, so render form again with sanitized values and error messages
            res.render('note_form', { title: 'Create Note', note: note, errors: errors.array() } );
        }
        else {
            // form data is valid
            // check if note with same name already exists
            Note.findOne({'name': req.body.name}).exec(function(err, found_note) {
                if (err) { return next(err); }
                if (found_note) {
                    // note with same name exists, so redirect to it's detail page
                    res.redirect(found_note.url);
                } else {
                    note.save(function(err) {
                        if (err) { return next(err); }
                        // note was saved, so redirect to it's detail page
                        Note.find({}, 'name', function (err, names) {
                            if (err) { return next(err); }
                            // Success, so render
                            res.render('note_detail', { title: 'Note Detail', note: note, names: names} );
                        });
                    })
                }
            })

        }

    }
];

// display note update on GET
exports.note_update_get = function (req, res, next) {

    Note.findById(req.params.id).exec(function(err, note) {
        if (err) { return next(err); }
        if (note===null) { // No results.
            const err = new Error('Note not found');
            err.status = 404;
            return next(err);
        }
        // successful, so render
        res.render('note_form', { title: 'Update Note', note: note });
    })

}

// display note update on POST
exports.note_update_post = [

    // validate that note name field is not empty (note body may be empty) --> what about > 100 characters?
    body('name', 'Name is required').isLength({min: 1}).trim(),

    // sanitize note name and body fields
    sanitizeBody('name').trim().escape(),
    sanitizeBody('body').trim().escape(),

    // process validated and sanitized request
    (req, res, next) => {

        // extract any validation errors
        const errors = validationResult(req);

        // create a note object with sanitized data (and the id of the existing note being updated!)
        const note = new Note(
            {
                name: req.body.name,
                body: req.body.body,
                _id: req.params.id
            }
        );

        if (!errors.isEmpty()) {
            // there are validation errors, so render form again with sanitized values and error messages
            res.render('note_form', { title: 'Create Note', note: note, errors: errors.array() } );
        }
        else {
            // form data is valid
            Note.findByIdAndUpdate(req.params.id, note, {}, function (err,the_note) {
                if (err) { return next(err); }
                // Successful - redirect to the updated note's detail page
                res.redirect(the_note.url);
            });
        }
    }
];

// display note delete on GET
exports.note_delete_get = function (req, res, next) {

    Note.findById(req.params.id).exec(function(err, note) {
        if (err) { return next(err); }
        if (note===null) { res.redirect('/notes'); } // note does not exist, so redirect to home page
        // successful, so render
        res.render('note_delete', { title: 'Delete Note', note: note });
    })

}

// display note delete on POST
exports.note_delete_post = function (req, res, next) {

    // assume note id is valid
    Note.findByIdAndRemove(req.body.id, function (err) {
        if (err) { return next(err); }
        // success, so redirect to home page
        res.redirect('/notes?action=deleted');
    });

};