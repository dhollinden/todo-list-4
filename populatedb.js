#! /usr/bin/env node

console.log('This script populates some test notes to your database. Specified database as argument - e.g.: populatedb mongodb://your_username:your_password@your_dabase_url');

// Get arguments passed on command line
const userArgs = process.argv.slice(2);
if (!userArgs[0].startsWith('mongodb://')) {
    console.log('ERROR: You need to specify a valid mongodb URL as the first argument');
    return
}

const async = require('async')
const Note = require('./models/note_model')
const User = require('./models/user_model')

const mongoose = require('mongoose');
const mongoDB = userArgs[0];
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
const db = mongoose.connection;
mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

const notes = []
const users = []

function noteCreate(name, body, user_id, cb) {
    notedetail = {name:name, body: body, user_id: user_id} // warning: user_id is an object, not merely the a string such as req.body.id will be

    const note = new Note(notedetail);

    note.save(function (err) {
        if (err) {
            cb(err, null)
            return
        }
        console.log('New Note: ' + note);
        notes.push(note)
        cb(null, note)
    }  );
}

function userCreate(email, password, admin, cb) {
    userdetail = {email:email, password:password, admin:admin}

    const user = new User(userdetail);

    user.save(function (err) {
        if (err) {
            cb(err, null)
            return
        }
        console.log('New User: ' + user);
        users.push(user)
        cb(null, user)
    }  );
}

function createNotes(cb) {
    async.parallel([
            function(callback) {
                noteCreate('Shopping List', 'lettuce, arugula, tomatoes', users[0], callback);
            },
            function(callback) {
                noteCreate('Errands', 'hardware store, dry cleaners, dog food', users[0], callback);
            },
            function(callback) {
                noteCreate('Yard Work', 'hose faucet leak, get ladder from Carol, order mulch', users[0], callback);
            },
            function(callback) {
                noteCreate('Test User veggie list', 'radishes, kholrabi, arugula', users[1], callback);
            },
            function(callback) {
                noteCreate('Test User dairy list', 'milk, ice cream, yogurt, butter', users[1], callback);
            },
            function(callback) {
                noteCreate('User2 tool list', 'hammer, anvil, chisel', users[2], callback);
            },
            function(callback) {
                noteCreate('User2 nap locations', 'bed, patio recliner, living room floor', users[2], callback);
            },
        ],
        // optional callback
        cb);
}

function createUsers(cb) {
    async.parallel([
            function(callback) {
                userCreate('dave.hollinden@ithaka.org', '$2a$10$8W1N9CjbkqJuTh1XHZyyYuCabP18iWgiN0F.uPtfSleGyyTubvIfi', true, callback);
            },
            function(callback) {
                userCreate('test@test.com', '$2a$12$nv9iV5/UNuV4Mdj1Jf8zfuUraqboSRtSQqCmtOc4F7rdwmOb9IzNu', false, callback);
            },
            function(callback) {
                userCreate('user2@example.com', '$2a$12$VHZ9aJ5A87YeFop4xVW.aOMm95ClU.EviyT9o0i8HYLdG6w6ctMfW', false, callback);
            },
        ],
        // optional callback
        cb);
}

async.series([
        createUsers,
        createNotes
    ],
// Optional callback
    function(err, results) {
        if (err) {
            console.log('FINAL ERR: '+err);
        }
        else {
            console.log('Notes: '+notes);

        }
        // All done, disconnect from database
        mongoose.connection.close();
    });
