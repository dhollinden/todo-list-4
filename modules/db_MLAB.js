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

exports.read = (model, criteria, selection = null, options = null) => {

    let from = (model === 'note') ? Note : User;

    return from.find(criteria)
        .select(selection)
        .sort(options)
        .exec();

};


// create
//   return: promise for document

exports.create = (model, criteria, options = null) => {

    let from = (model === 'note') ? Note : User;

    return from.create(criteria)

};


// update
// Updates one document in the database without returning it.
//   updates: object ({name: 'some name', body: 'some body'})
//   return: promise for raw update

exports.update = (model, criteria, updates, options = null) => {

    let from = (model === 'note') ? Note : User;

    return from.where(criteria)
        .update(updates)
        .exec();

};

// delete
//   return: promise

exports.remove = (model, criteria, options = null) => {

    let from = (model === 'note') ? Note : User;

    return from.findOneAndDelete(criteria)
        .exec();

};