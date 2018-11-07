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