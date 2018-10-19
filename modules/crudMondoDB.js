const Note = require('../models/note_model');
const User = require('../models/user_model');

// read
    // collection: data model (Note or User)
    // criteria: object with key/value pairs defining search criteria
    // selection: space delimited string ('name body') or object ({name: 1, body: 1})
    // options: space delimited string ('name -body') or object ({name: 1, body: -1}, {name: 'asc', body: 'desc'})
    // return: promise for an array of documents

exports.read = function(collection, criteria, selection = null, options = null) {

    console.log(`inside read function: criteria = ${criteria}`);

    let from = (collection === 'note') ? Note : User;

    return from.find(criteria)
        .select(selection)
        .sort(options)
        .exec();

};


// create

exports.create = function(document, options = null) {

    console.log(`inside create function: document = ${document}`);

    return document.save();  // does this return a promise?

};


// update

exports.update = function(model, criteria, updates, options = null) {

    console.log(`inside update function: updates = ${updates}`);

    let from = (model === 'note') ? Note : User;

    return from.where(criteria)
        .update(updates)
        .exec();

};

// delete

exports.remove = function(model, criteria, options = null) {

    console.log(`inside delete function: criteria = ${criteria}`);

    let from = (model === 'note') ? Note : User;

    return from.findOneAndDelete(criteria)
        .exec();

};