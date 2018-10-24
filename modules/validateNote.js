const {read, create, update, remove} = require('../modules/crudMondoDB');


exports.validateNote = function(id) {

    // read individual note with supplied id
    criteria = {'_id': id};

    console.log(`inside validateNote: id = ${id}`)
    console.log(`inside validateNote: criteria = ${criteria}`)

    read('note', criteria)
        .then(function (note) {

            // if there are no results, redirect with error message
            if (note[0] === null || typeof note[0] === 'undefined') {
                return res.redirect('/notes?message=invalidId');
            }

            // if note ID is not formed properly, redirect with error message
            if (note[0].error === 'invalidId') {
                return res.redirect('/notes?message=improperId');
            }

            // if note doesn't belong to user, redirect with error message
            if (note[0].user_id !== req.user.id) {
                return res.redirect('/notes?message=not_yours');
            }

            console.log(`inside validateNote: inside then: note = ${note}`)
            return note

        })
        .catch(function (err) {

            console.log(`inside validateNote: inside catch`)
            if (err) return err;

        });

}