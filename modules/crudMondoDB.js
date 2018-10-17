const Note = require('../models/note_model');
const User = require('../models/user_model');

// read data
// collection: object
// criteria: object with key/value pairs defining search criteria
// selection: space delimited string ('name body') or object ({name: 1, body: 1})
// options: space delimited string ('name -body') or object ({name: 1, body: -1}, {name: 'asc', body: 'desc'})
// return: promise
exports.read = function(collection, criteria, selection = null, options = null) {

    let from = Note;
    if (collection === 'user') {
        from = User;
    }


    return from.find(criteria)
        .select(selection)
        .sort(options)
        .exec();

};