const express = require('express');
const session = require('cookie-session')
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const createError = require('http-errors');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// for authentication
const uuid = require('uuid/v4')

// routers
const indexRouter = require('./routes/index');
const notesRouter = require('./routes/notes');

// compression, protection, logging
const compression = require('compression');
const helmet = require('helmet');
const logger = require('morgan');

//Set up mongoose connection
const mongoose = require('mongoose');
const mongoDB = process.env.MONGODB_URI || 'mongodb://todo-list-4-admin:todo-list-4-password@ds235461.mlab.com:35461/todo-list-4';
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// express app
const app = express();

// view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// static path
app.use(express.static(path.join(__dirname, 'public')));

// clarify this section
app.use(helmet());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(compression()); //Compress all routes

// from authorization tutorial
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(session({

    name: 'sessionId',
    secret: 'ADKHLa4LpR6Vr1z/MbWDEnjQk3Q=',
    cookie: {
        secure: false,
        httpOnly: true,
        // domain: 'example.com',
        // path: 'foo/bar',
        expires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    }
}))
app.use(passport.initialize());
app.use(passport.session());

// routers
app.use('/', indexRouter);
// redirect unauthenticated users from /notes to home page
app.use('/notes', function (req, res, next) {
    if(!req.isAuthenticated())
        res.redirect('/?message=not_logged_in');
    else
        next()
}, notesRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    console.log("err = ", err);
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
