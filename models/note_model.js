const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const NoteSchema = new Schema(
    {
        name: {type: String, required: true, max: 100},
        body: {type: String, max: 1000},
        user_id: {type: 'String', required: true }
    }
);

// virtual for note's URL
NoteSchema
    .virtual('url')
    .get(function () {
        return '/notes/' + this._id;
    });

// export model
module.exports = mongoose.model('Note2', NoteSchema);