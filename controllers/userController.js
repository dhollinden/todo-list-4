const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user_model');
const Note = require('../models/note_model');
const bcrypt = require('bcrypt-nodejs');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
const { getAllNotesForUser, findNoteById, findAnotherNoteWithSameName } = require('../modules/note_functions');


// ------------- Passport -------------

// configure passport to use the local strategy
passport.use(new LocalStrategy(

    { usernameField: 'email' },

    (email, password, done) => {

        User.findOne({'email': email}).exec(function (err, user) {

            // if there is an error while looking for user, return "done" with the error
            if (err) return done(err);

            // if there is no user with the supplied email address, return "done" with an error message
            if (!user) {
                return done(null, false, { message: 'login_invalid_creds' });
            }

            // if user's password doesn't match the supplied password, return "done" with an error message
            if (!bcrypt.compareSync(password, user.password)) {
                return done(null, false, { message: 'login_invalid_creds' });
            }

            // is user is found and password matches, return "done" with the user
            return done(null, user);
        })
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
    User.findById(id).exec(function (err, user) {

        // if the search results in an error, return "done" with the error and no user
        if (err) return done(err, false);

        // if user is found, return "done" with the user
        return done(null, user);
    })

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

    // check if id on query string matches id of logged in user
    if (req.user.id == req.params.id) {

        // delete notes
        Note.deleteMany({user_id: req.user.id}, function (err) {
            if (err) return next(err);
        })

        // delete user
        User.deleteOne({_id: req.user.id}, function (err) {
            if (err) return next(err);
        })

        // logout user, redirect to home page
        req.logOut()
        res.redirect('/?message=account_deleted');

    } else {

        // ids don't match, so redirect
        res.redirect('/account?message=delete_failed')
    }
}


// account email update GET
exports.account_email_get = function (req, res, next) {

    // look up current email in database  --- unnecessary?
    User.findById(req.user.id, function (err, account) {

        if (err) return next(err);

        // render page
        const message = req.query.message;
        const pageContent = {
            title: 'My Account: Update Email Address',
            email: account.email,
            message: message,
            authenticated: req.isAuthenticated()
        }
        res.render('user_email_form', pageContent);
    })

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

        // Extract the validation errors
        const errors = validationResult(req);

        if (!errors.isEmpty()) {

            // there are errors, so render again with error messages
            const pageContent = {
                title: 'My Account: Update Email Address',
                email: req.user.email,
                errors: errors.array(),
                authenticated: req.isAuthenticated()
            }
            res.render('user_email_form', pageContent);

        }

        else {

            // check whether email address has already been used
            User.findOne({'email': req.body.new_email}).exec(function (err, existing_user) {

                if (err) return next(err);

                if (existing_user) {

                    // email has been used, render again with error message
                    const pageContent = {
                        title: 'My Account: Update Email Address: Error',
                        message: 'email_update_registered',
                        authenticated: req.isAuthenticated()
                    }
                    res.render('user_email_form', pageContent);

                } else {

                    // update email address
                    User.findByIdAndUpdate(req.user.id, {email: req.body.new_email}, function (err) {

                        if (err) return next(err);

                        return res.redirect('/account?message=email_update_success')

                    })

                }
            })
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
                password: req.user.password,
                errors: errors.array(),
                authenticated: req.isAuthenticated()
            }
            res.render('user_password_form', pageContent);

        }

        else {

            // check if submitted current password matches what's in database
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
                User.findByIdAndUpdate(req.user.id, {password: new_password_hashed}, function (err) {

                    if (err) return next(err);

                    return res.redirect('/account?message=password_update_success')

                })

            }

        }
    }
];


