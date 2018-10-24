const Note = require('../models/note_model');
const User = require('../models/user_model');
const mongoose = require('mongoose');

// ALL
// model: data model (Note or User)
// criteria: object with key/value pairs defining search criteria
// options: space delimited string ('name -body') or object ({name: 1, body: -1} or {name: 'asc', body: 'desc'})

// --------


// read
//   selection: space delimited string ('name body') or object ({name: 1, body: 1})
//   return: promise for an array of documents

exports.read = function(model, criteria, selection = null, options = null) {


    // if note _id is a criteria, and it's not a valid ObjectId, return an error
    if ('_id' in criteria && !mongoose.Types.ObjectId.isValid(criteria._id)) {

        return new Promise(function (resolve, reject) {

            resolve([{'error': 'invalidId'}]);

        });
    };

    let from = (model === 'note') ? Note : User;

    return from.find(criteria)
        .select(selection)
        .sort(options)
        .exec();

};


// create
//   return: promise for document

exports.create = function(model, criteria, options = null) {

    let from = (model === 'note') ? Note : User;

    return from.create(criteria)

};


// update
//   updates: object ({name: 'some name', body: 'some body'})
//   return: promise for raw update

exports.update = function(model, criteria, updates, options = null) {

    let from = (model === 'note') ? Note : User;

    return from.where(criteria)
        .update(updates)
        .exec();

};

// delete
//   return: promise

exports.remove = function(model, criteria, options = null) {

    let from = (model === 'note') ? Note : User;

    return from.findOneAndDelete(criteria)
        .exec();

};