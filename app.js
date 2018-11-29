// load environment variables from a .env file into process.env
require('dotenv').config()

const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const session = require('cookie-session')
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
// const createError = require('http-errors');
const passport = require('passport');


// routers
const indexRouter = require('./routes/index');
const notesRouter = require('./routes/notes');
const accountRouter = require('./routes/account');


// compression, protection, logging
const helmet = require('helmet');
const logger = require('morgan');
const compression = require('compression');


// database connection for mLab
const db_type = process.env.DB
if (db_type === "db_MLAB") {

    const mongoose = require('mongoose');
    const mongoDB = process.env.MONGODB_URI || 'mongodb://todo-list-4-admin:todo-list-4-password@ds235461.mlab.com:35461/todo-list-4';
    mongoose.connect(mongoDB, { useNewUrlParser: true });
    mongoose.Promise = global.Promise;
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'MongoDB connection error:'));

}

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));
app.use(helmet());
app.use(logger('dev'));
app.use(compression()); //Compress all routes
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }))

// clarify need for these
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));


// session management
const secret = process.env.SECRET;
app.use(session({
    name: 'sessionId',
    secret: secret,
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
// redirect unauthenticated users from /account to home page
app.use('/account', (req, res, next) => {
    if(!req.isAuthenticated())
        res.redirect('/?message=not_logged_in');
    else
        next()
}, accountRouter);
// redirect unauthenticated users from /notes to home page
app.use('/notes', (req, res, next) => {
    if(!req.isAuthenticated())
        res.redirect('/?message=not_logged_in');
    else
        next()
}, notesRouter);


// catch 404 and forward to error handler
app.use( (req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});


// error handler
app.use( (err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
