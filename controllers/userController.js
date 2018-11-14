const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user_model');
const Note = require('../models/note_model');
const bcrypt = require('bcrypt-nodejs');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
const { read, create, update, remove } = require('../modules/' + process.env.DB);
const { getAllNotesForUser, findNoteById, findAnotherNoteWithSameName } = require('../modules/note_functions');


// ------------- Passport -------------

// configure passport to use the local strategy
passport.use(new LocalStrategy(

    { usernameField: 'email' },

    (email, password, done) => {

        const model = 'user'
        const criteria = { 'email': email }

        read(model, criteria)

            .then( user => {

                // if there is no user with the supplied email address, return "done" with an error message

                if (!user[0]) {
                   return done(null, false, { message: 'login_invalid_creds' });
                }

                // if user's password doesn't match the supplied password, return "done" with an error message

                if (!bcrypt.compareSync(password, user[0].password)) {
                    return done(null, false, { message: 'login_invalid_creds' });
                }

                // return "done" with the user

                return done(null, user[0]);


            })
            .catch( err => {

                if (err) return done(err);

            });

    }
));


// tell passport how to serialize the user
passport.serializeUser((user, done) => {

    // given a user, simply call "done" with the user.id
    done(null, user.id);

});

// tell passport how to deserialize the user
passport.deserializeUser((id, done) => {

    // search for user by id

    const model = 'user'
    const criteria = { '_id': id }

    read(model, criteria)

        .then( user => {

            // if user is found, return "done" with the user

            return done(null, user[0]);

        })
        .catch( err => {

            // if the search results in an error, return "done" with the error and no user

            if (err) return done(err, false);
        });

});




// ------------- callbacks -------------

// home page GET
exports.index = function (req, res, next) {

    const message = req.query.message;
    const pageContent = {
        title: 'Notes Home',
        message: message,
        authenticated: req.isAuthenticated()
    }
    res.render('index', pageContent);

}


// signup GET
exports.signup_get = function (req, res, next) {

    const pageContent = {
        title: 'Sign Up',
        authenticated: req.isAuthenticated()
    }
    res.render('user_form', pageContent);

};


// signup POST
exports.signup_post = [

    // validate email and password
    body('email', 'You must enter a valid email address.')
        .isEmail(),

    body('password', 'Your password must be at least eight characters long.')
        .isLength({ min: 8 })
        .trim(),

    // sanitize email, but not password
    sanitizeBody('email').trim().escape(),

    // process request
    (req, res, next) => {

        // extract any validation errors
        const errors = validationResult(req);

        // create a user object with sanitized data
        const user = new User(
            {
                email: req.body.email,
                password: req.body.password
            }
        );

        if (!errors.isEmpty()) {

            // there are validation errors
            // render again with error messages and sanitized email
            const pageContent = {
                title: 'Sign Up Error',
                email: user.email,
                errors: errors.array(),
                authenticated: req.isAuthenticated()
            }
            res.render('user_form', pageContent);

        }

        else {

            // check whether email address has already been used

            const model = 'user'
            const criteria = { 'email': user.email }

            read(model, criteria)

                .then( other_user_with_email => {

                    if (other_user_with_email[0]) {

                        // email has been used, render again with error message

                        const pageContent = {

                            title: 'Sign Up Error',
                            message: 'signup_email_registered',
                            authenticated: req.isAuthenticated()

                        }

                        res.render('user_form', pageContent);

                    }

                    // email is unique, hash the password

                    const saltRounds = 10;
                    user.password = bcrypt.hashSync(user.password, bcrypt.genSaltSync(saltRounds));

                    // save user

                    const model = 'user'
                    const criteria = {

                        email: user.email,
                        password: user.password
                    }

                    create(model, user)

                        .then( created_user => {

                            // user was created, redirect to login page

                            return res.redirect('/login?message=signup_success')

                        })

                })

                .catch( err => {

                    if (err) return next(err);

                });


/*
            User.findOne({'email': user.email}).exec(function (err, existing_user) {

                if (err) return next(err);

                if (existing_user) {

                    // email has been used, render again with error message
                    const pageContent = {
                        title: 'Sign Up Error',
                        message: 'signup_email_registered',
                        authenticated: req.isAuthenticated()
                    }
                    res.render('user_form', pageContent);

                }

                else {

                    // email is new, hash the password
                    const saltRounds = 10;
                    user.password = bcrypt.hashSync(user.password, bcrypt.genSaltSync(saltRounds));

                    // save user
                    user.save(function (err) {

                        if (err) return next(err);

                        // save was successful, redirect to login page
                        return res.redirect('/login?message=signup_success')

                    })

                }
            })
*/
        }
    }
];


// login GET
exports.login_get = function (req, res, next) {

    const message = req.query.message;
    const pageContent = {

        title: 'Log In',
        message: message,
        authenticated: req.isAuthenticated()

    }

    res.render('user_form', pageContent);

};


// login page POST
exports.login_post = [

    // Validate email. Require password, but do not validate min length of 8
    body('email', 'You must enter a valid email address.')
        .isEmail(),

    body('password', 'You must enter a password.')
        .isLength({ min: 1 })
        .trim(),

    // Sanitize email, but not password
    sanitizeBody('email').trim().escape(),

    // Process request
    (req, res, next) => {

        // Extract the validation errors
        const errors = validationResult(req);

        if (!errors.isEmpty()) {

            // there are validation errors
            // render again with error messages and sanitized values
            const pageContent = {
                title: 'Log In Error',
                errors: errors.array(),
                authenticated: req.isAuthenticated()
            }
            res.render('user_form', pageContent);

        }
        else {

            // authenticate using Passport local strategy
            passport.authenticate('local', (err, user, info) => {

                // check for authentication error
                if (err) return next(err);

                // if Passport returns "info" about problems with credentials, render page again
                if (info) {

                    const pageContent = {
                        title: 'Log In Error',
                        message: info.message,
                        authenticated: req.isAuthenticated()
                    }
                    return res.render('user_form', pageContent);

                }

                // authentication was successful, so log in user
                req.login(user, (err) => {

                    if (err) return next(err);

                    res.redirect('/notes?message=login_success');

                })

            })(req, res, next);
        }
    }
];


// logout POST
exports.logout_get = function (req, res, next) {

    req.logout();
    res.redirect('/?message=logged_out')

}



// account GET
exports.account = function (req, res, next) {

    const message = req.query.message;

    getAllNotesForUser(req.user.id)

        .then(notes => {

            // render page
            const pageContent = {
                title: 'My Account',
                email: req.user.email,
                user_id: req.user.id,
                notes: notes,
                message: message,
                authenticated: req.isAuthenticated()
            }

            res.render('user_account', pageContent);

        })

        .catch( err => {

            if (err) return next(err);

        });

};



// account delete GET
exports.account_delete = function (req, res, next) {

    if (req.user.id !== req.params.id) {

        // ids don't match, so redirect
        res.redirect('/account?message=delete_failed')

    }

    // proceed with delete

    const model = 'note';
    const criteria = { 'user_id': req.user.id };

    remove(model, criteria)

        .then( deleted_note => {

            const model = 'user';
            const criteria = { '_id': req.user.id };

            remove(model, criteria)

                .then( deleted_user => {

                // logout user, redirect to home page
                req.logOut()
                res.redirect('/?message=account_deleted');

            })

        })
        .catch( err => {

            if (err) return next(err);

        });

}


// account email update GET
exports.account_email_get = function (req, res, next) {

    // render page

    const pageContent = {

        title: 'My Account: Update Email Address',
        email: req.user.email,
        message: req.query.message,
        authenticated: req.isAuthenticated()

    }

    res.render('user_email_form', pageContent);

}



// account email update POST
exports.account_email_post = [

    // Validate email

    body('new_email', 'You must enter a valid email address for the new email address.')
        .isEmail(),

    // Sanitize email

    sanitizeBody('new_email').trim().escape(),

    // Process request

    (req, res, next) => {

        // Extract validation errors

        const errors = validationResult(req);

        if (!errors.isEmpty()) {

            // there are errors, so render again with error messages

            const pageContent = {

                title: 'My Account: Update Email Address: Error',
                email: req.user.email,
                new_email: req.body.new_email,
                errors: errors.array(),
                authenticated: req.isAuthenticated()

            }

            res.render('user_email_form', pageContent);

        }

        else {

            // check whether email address has already been used

            const model = 'user'
            const criteria = { 'email': req.body.new_email }

            read(model, criteria)

                .then( existing_user => {

                    if (existing_user[0]) {

                        // email has been used, render again with error message

                        const pageContent = {

                            title: 'My Account: Update Email Address: Error',
                            email: req.user.email,
                            new_email: req.body.new_email,
                            message: 'email_update_registered',
                            authenticated: req.isAuthenticated()

                        }

                        res.render('user_email_form', pageContent);
                    }

                    // update email address

                    const model = 'user'
                    const criteria = { '_id': req.user.id }
                    const updates = { 'email': req.body.new_email }

                    console.log(`criteria._id = ${criteria._id}`)
                    console.log(`updates.email = ${updates.email}`)

                    update(model, criteria, updates)

                        .then( updated_user => {

                            return res.redirect('/account?message=email_update_success')

                        })

                    })

                .catch( err => {

                    if (err) return next(err);

                });

        }
    }
];



// account password update GET
exports.account_password_get = function (req, res, next) {

    // render page
    const message = req.query.message;
    const pageContent = {
        title: 'My Account: Update Password',
        message: message,
        authenticated: req.isAuthenticated()
    }
    res.render('user_password_form', pageContent);

}



// account password update POST
exports.account_password_post = [

    // validate new password field
    body('new_password', 'Your new password must be at least eight characters long.')
        .isLength({ min: 8 })
        .trim(),

    // do not sanitize password fields

    // Process request
    (req, res, next) => {

        // Extract the validation errors
        const errors = validationResult(req);

        if (!errors.isEmpty()) {

            // there are errors, so render again with error messages
            const pageContent = {
                title: 'My Account: Update Password: Error',
                errors: errors.array(),
                authenticated: req.isAuthenticated()
            }
            res.render('user_password_form', pageContent);

        }

        else {

            // test the submitted current password against what's in database

            if (!bcrypt.compareSync(req.body.cur_password, req.user.password)) {

                // no match, so render page with error message

                const pageContent = {

                    title: 'My Account: Update Password: Error',
                    message: 'incorrect_password',
                    authenticated: req.isAuthenticated()

                }

                res.render('user_password_form', pageContent);

            }

            else {

                // passwords match, so hash the new password

                const saltRounds = 10;
                const new_password_hashed = bcrypt.hashSync(req.body.new_password, bcrypt.genSaltSync(saltRounds));

                // update the password

                const model = 'user';
                const criteria = { '_id': req.user.id };
                const updates = { 'password': new_password_hashed };

                update(model, criteria, updates)

                    .then( result => {

                        return res.redirect('/account?message=password_update_success')

                    })
                    .catch( err => {

                        if (err) return next(err);

                    })

            }

        }
    }
];


