const { read } = require('../modules/' + process.env.DB);

exports.getAllNotesForUser = user_id => {

    // read all notes for this user_id and return as a promise
    const item = 'note';
    const criteria = {'user_id': user_id};
    const selection = '';
    const options = {name: 1};

    const results = read(item, criteria, selection, options)
        .then(notes => {

            return new Promise( (resolve, reject) => {

                resolve(notes);

            });

        })
        .catch(err => {

            if (err) return next(err);

        });

    return results;
}


exports.findNoteById = (notes, note_id) => {

    // look for a note with _id = note_id among the supplied notes
    const foundNote = notes.filter(note => String(note._id) === note_id)[0]

    // return the note, or null if a note is not found
    return (foundNote === null || typeof foundNote === 'undefined') ? null : foundNote;

}


exports.findAnotherNoteWithSameName = (notes, note_id, newName) => {

    // look for a note with a different _id and name = newName among the supplied notes
    const foundNote = notes.filter(note => String(note._id) !== note_id && note.name === newName)[0]

    // return the note, or null if a note is not found
    return (foundNote === null || typeof foundNote === 'undefined') ? null : foundNote;

}