const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user_model');
const bcrypt = require('bcrypt-nodejs');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');


// ------------- Passport -------------

// configure passport.js to use the local strategy
passport.use(new LocalStrategy(
    { usernameField: 'email' },
    (email, password, done) => {

        // replace the following with mongodb
        console.log(`email = ${email}`)
        console.log(`password = ${password}`)
        User.findOne({'email': email}).exec(function (err, user) {
            if (err) return done(err);
            if (!user) {
                return done(null, false, { message: 'login_invalid_creds' });
            }
            if (!bcrypt.compareSync(password, user.password)) {
                return done(null, false, { message: 'login_invalid_creds' });
            }
            return done(null, user);
        })
    }
));

// tell passport how to serialize and deserialize the user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id).exec(function (err, user) {
        if (err) return done(err, false);
        return done(null, user);
    })
});


// ------------- callbacks -------------

// home page GET
exports.index = function (req, res, next) {

    const message = req.query.message;
    res.render('index', {message: message});
}


// signup page GET
exports.signup_get = function (req, res, next) {

    res.render('user_form', {title: 'Sign Up'});

};


// signup page POST
exports.signup_post = [

    // Validate email and password
    body('email', 'You must enter a valid email address.').isEmail(),
    body('password', 'Your password must be at least eight characters long.').isLength({ min: 8 }).trim(),

    // Sanitize email, but not password
    sanitizeBody('email').trim().escape(),

    // Process request
    (req, res, next) => {

        // Extract the validation errors
        const errors = validationResult(req);

        // create a user object with sanitized data
        const user = new User(
            {
                email: req.body.email,
                password: req.body.password
            }
        );

        if (!errors.isEmpty()) {
            // There are errors. Render the form again with error messages and sanitized values.
            res.render('user_form', { title: 'Sign Up Error', errors: errors.array()});
        }
        else {

            // const password = req.body.password;
            User.findOne({'email': user.email}).exec(function (err, existing_user) {
                if (err) return next(err);
                if (existing_user) {
                    // email exists in db so render signup page with error message
                    return res.render('user_form', {title: 'Sign Up Error', message: 'signup_email_registered'})
                } else {

                    // hash the password with bcrypt
                    const saltRounds = 10;
                    user.password = bcrypt.hashSync(user.password, bcrypt.genSaltSync(saltRounds));

                    // store user in db
                    user.save(function (err) {
                        if (err) return next(err);
                        return res.redirect('/login?message=signup_success')
                    })

                }
            })


/*
            const password = req.body.password;
            axios.get(`http://localhost:5000/users?email=${req.body.email}`)
                .then(res_axios => {
                    const user = res_axios.data[0];
                    if (user) {
                        // email exists in db so return to signup page
                        return res.render('user_form', {title: 'Sign Up Error', message: 'signup_email_registered'})
                    } else {

                        // hash the password with bcrypt and create random id
                        const saltRounds = 10;
                        const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(saltRounds));
                        const id = Math.random().toString(36).substring(2, 9);

                        // store data in the db.json using axios.post()
                        axios.post('http://localhost:5000/users', {
                            id: id,
                            email: req.body.email,
                            password: hash
                        })
                        .then(function (response) {
                            return res.redirect('/login?message=signup_success')
                        })
                        .catch(error => next(error));
                    }
                })
                .catch(error => next(error));
*/
        }
    }
];


// login page GET
exports.login_get = function (req, res, next) {

    const message = req.query.message;
    res.render('user_form', {title: 'Log In', message: message});

};


// login page POST
exports.login_post = [

    // Validate email. Require password, but do not validate min length of 8
    body('email', 'You must enter a valid email address.').isEmail(),
    body('password', 'You must enter a password.').isLength({ min: 1 }).trim(),

    // Sanitize email, but not password
    sanitizeBody('email').trim().escape(),

    // Process request
    (req, res, next) => {

        // Extract the validation errors
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // There are errors. Render the form again with error messages and sanitized values.
            res.render('user_form', {title: 'Log In Error', errors: errors.array()});
        }
        else {

            // authenticate using Passport local strategy
            passport.authenticate('local', (err, user, info) => {

                // check for messages, and render page again
                if (info) return res.render('user_form', {title: 'Log In', message: info.message});

                // check for error during authentication
                if (err) return next(err);

                // check for no user (for any reason)
                if (!user) return res.redirect('/login');

                // success, so log in user
                req.login(user, (err) => {
                    if (err) return next(err);
                    res.redirect('/notes?message=login_success');
                })
            })(req, res, next);
        }
    }
];


