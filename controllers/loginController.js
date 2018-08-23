const Note = require('../models/note');
const async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');


const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const axios = require('axios');
const bcrypt = require('bcrypt-nodejs');


// ------------- Passport -------------

// configure passport.js to use the local strategy
passport.use(new LocalStrategy(
    { usernameField: 'email' },
    (email, password, done) => {
        axios.get(`http://localhost:5000/users?email=${email}`)
            .then(res => {
                const user = res.data[0]
                if (!user) {
                    return done(null, false, { message: 'Invalid email address.\n' });
                }
                if (!bcrypt.compareSync(password, user.password)) {
                    console.log("in bcrypt.compareSync: ", password, user.password);
                    return done(null, false, { message: 'Invalid password.\n' });
                }
                return done(null, user);
            })
            .catch(error => done(error));
    }
));

// tell passport how to serialize and deserialize the user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    axios.get(`http://localhost:5000/users/${id}`)
        .then(res => done(null, res.data) )
        .catch(error => done(error, false))
});


// ------------- callbacks -------------

// login page GET
exports.login_get = function (req, res, next) {

    res.render('login', {title: 'Log In'});

};


// login page POST
exports.login_post = function (req, res, next) {

    passport.authenticate('local', (err, user, info) => {
        console.log(err, user, info);
        if(info) {return res.render('login', {title: 'Log In', message: info.message})}
        if (err) { return next(err); }
        if (!user) { return res.redirect('/login'); }  // what is this for?
        req.login(user, (err) => {
            if (err) { return next(err); }
            return res.render('login', {title: 'Log In', message: 'Login was successful'});
        })
    })(req, res, next);

};


// signup page GET
exports.signup_get = function (req, res, next) {

    res.render('login', {title: 'Sign Up'});

};


// signup page POST
exports.signup_post = function (req, res, next) {

    const password = req.body.password;
    axios.get(`http://localhost:5000/users?email=${req.body.email}`)
        .then(res_axios => {
            const user = res_axios.data[0];
            if (user) {
                // email exists in db so return to signup page
                return res.render('login', {title: 'Sign Up Error', message: `The email address ${req.body.email} has already been registered`})
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
                        return res.render('login', {title: 'Sign Up Success', message: `Success! You have been registered with the email address ${req.body.email}`})
                    })
                    .catch(error => next(error));
            }
        })
        .catch(error => next(error));




// then call req.login() with the user object you’ve created.

};
