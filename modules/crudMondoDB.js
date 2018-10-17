
// read data
// collection: object
// criteria: object with key/value pairs defining search criteria
// selection: space delimited string ('name body') or object ({name: 1, body: 1})
// options: space delimited string ('name -body') or object ({name: 1, body: -1}, {name: 'asc', body: 'desc'})
// options: object with key/value pairs defining search options
// return: promise
exports.read = function(collection, criteria, selection = null, options = null) {

    return collection.find(criteria)
        .select(selection)
        .sort(options)
        .exec();

};