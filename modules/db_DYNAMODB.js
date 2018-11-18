
// ALL
// model: data model (Note or User)
// criteria: object with key/value pairs defining search criteria
// options: space delimited string ('name -body') or object ({name: 1, body: -1} or {name: 'asc', body: 'desc'})


// create database connection
const AWS = require("aws-sdk");

AWS.config.update({
    region: "us-east-1",
    endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

AWS.config.setPromisesDependency(null);

const docClient = new AWS.DynamoDB.DocumentClient();

// --------


// read
//   selection: space delimited string ('name body') or object ({name: 1, body: 1})
//   return: promise for an array of documents
exports.read = (type, criteria, selection = null, options = null) => {

    const table = (type === 'user') ? "users" : "notes";
    const id = criteria._id;
    const params = {
        TableName: table,
        Key:{
            "_id": id
        }
    };

    var results = [];

    return new Promise((resolve, reject) => {

        docClient.get(params).promise()

            .then((data) => {

                // console.log("GetItem succeeded:", data);
                for (let result in data) {
                    results.push(data[result])
                }
                // results.forEach(x => { Object.keys(x).forEach(key => console.log(`${key} = ${x[key]}`))})
                resolve (results);

            })
            .catch( err => {

                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                reject (err);

            });
    });

    /*
        const params2 = {
            TableName : table,
            KeyConditionExpression: "#id = :id",
            ExpressionAttributeNames:{
                "#id": "_id"
            },
            ExpressionAttributeValues: {
                ":id": id
            }
        };

        docClient.query(params2, function(err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
            } else {
                console.log("Query succeeded.");
                data.Items.forEach(function(item) {
                    console.log(" -", item.year + ": " + item.title);
                });
            }
        });
    */


};


// create
//   return: promise for document

exports.create = (model, criteria, options = null) => {

    let from = (model === 'note') ? Note : User;

    return "from db_DYNAMODB create callback"

};


// update
// Updates one document in the database without returning it.
//   updates: object ({name: 'some name', body: 'some body'})
//   return: promise for raw update

exports.update = (model, criteria, updates, options = null) => {

    let from = (model === 'note') ? Note : User;

    return "from db_DYNAMODB update callback"

};

// delete
//   return: promise

exports.remove = (model, criteria, options = null) => {

    let from = (model === 'note') ? Note : User;

    return "from db_DYNAMODB delete callback"

};