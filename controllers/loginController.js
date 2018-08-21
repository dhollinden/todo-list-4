const Note = require('../models/note');
const async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');


const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// configure passport.js to use the local strategy
passport.use(new LocalStrategy(
    { usernameField: 'email' },
    (email, password, done) => {
        axios.get(`http://localhost:5000/users?email=${email}`)
            .then(res => {
                const user = res.data[0]
                if (!user) {
                    return done(null, false, { message: 'Invalid credentials.\n' });
                }
                if (!bcrypt.compareSync(password, user.password)) {
                    return done(null, false, { message: 'Invalid credentials.\n' });
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

    res.send(`You got the login page!\n`)

};

// handle login page on POST
exports.login_post= function (req, res, next) {

    passport.authenticate('local', (err, user, info) => {
        if(info) {return res.send(info.message)}
        if (err) { return next(err); }
        if (!user) { return res.redirect('/login'); }
        req.login(user, (err) => {
            if (err) { return next(err); }
            return res.redirect('/authrequired');
        })
    })(req, res, next);

};

