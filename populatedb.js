#! /usr/bin/env node

console.log('This script populates some test notes to your database. Specified database as argument - e.g.: populatedb mongodb://your_username:your_password@your_dabase_url');

// Get arguments passed on command line
var userArgs = process.argv.slice(2);
if (!userArgs[0].startsWith('mongodb://')) {
    console.log('ERROR: You need to specify a valid mongodb URL as the first argument');
    return
}

var async = require('async')
var Note = require('./models/note')

var mongoose = require('mongoose');
var mongoDB = userArgs[0];
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
var db = mongoose.connection;
mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

var notes= []

function noteCreate(name, body, cb) {
    notedetail = {name:name , body: body }

    var note = new Note(notedetail);

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

function createNotes(cb) {
    async.parallel([
            function(callback) {
                noteCreate('Shopping', 'lettuse, arugula, tomatoes', callback);
            },
            function(callback) {
                noteCreate('Errands', 'hardware store, dry cleaners, dog food', callback);
            },
            function(callback) {
                noteCreate('Yard Work', 'hose faucet leak, get ladder from Carol, order mulch', callback);
            },
        ],
        // optional callback
        cb);
}

async.series([
        createNotes,
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
