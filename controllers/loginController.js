const Note = require('../models/note');
const async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');


const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const axios = require('axios');
const bcrypt = require('bcrypt-nodejs');


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


// display login page on GET
exports.login_get= function (req, res, next) {

    res.render('login', {title: 'Login'});

};

// handle login page on POST
exports.login_post= function (req, res, next) {

    passport.authenticate('local', (err, user, info) => {
        console.log(err, user, info);
        if(info) {return res.render('login', {title: 'Login', message: info.message})}
        if (err) { return next(err); }
        if (!user) { return res.redirect('/login'); }  // what is this for?
        req.login(user, (err) => {
            if (err) { return next(err); }
            return res.render('login', {title: 'Login', message: 'Login was successful'});
        })
    })(req, res, next);

};

