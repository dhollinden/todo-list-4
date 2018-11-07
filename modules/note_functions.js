const {read} = require('../modules/crudMondoDB');

exports.getUsersNotes = function (user_id) {

    // read all notes for this user_id
    const model = 'note';
    const criteria = {'user_id': user_id};
    const selection = '';
    const options = {name: 1};

    const results = read(model, criteria, selection, options)
        .then(notes => {

            return new Promise(function (resolve, reject) {

                resolve(notes);

            });

        })
        .catch(err => {

            if (err) return next(err);

        });

    return results;
}


exports.findNoteById = function (notes, note_id) {

    // look for a note with _id = note_id among the supplied notes
    const foundNote = notes.filter(note => String(note._id) === note_id)[0]

    // if a note is not found, return null
    return (foundNote === null || typeof foundNote === 'undefined') ? null : foundNote;

}


exports.selectedNoteExists = function (notes, note_id) {

    // look for a note with _id = note_id among the notes
    const theNote = notes.filter(note => String(note._id) === note_id)[0]

    // if a note with _id = note_id is not found, return false
    if (theNote === null || typeof theNote === 'undefined') {
        return false;
    } else {
        return true;
    }

}