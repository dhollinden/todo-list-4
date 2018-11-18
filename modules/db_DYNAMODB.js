
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

    console.log(`inside db_DYNAMODB read`)

    const table = (type === 'user') ? "users" : "notes";
    const id = criteria._id;
    const email = criteria.email;

    let params;

    switch(table) {

        case 'users':

            if (email) {

                params = {

                    TableName : table,
                    IndexName: 'email-index',
                    KeyConditionExpression: "#email = :email",
                    ExpressionAttributeNames:{
                        "#email": "email"
                    },
                    ExpressionAttributeValues: {
                        ":email": email
                    }

                };

            } else {

                params = {

                    TableName : table,
                    KeyConditionExpression: "#id = :id",
                    ExpressionAttributeNames:{
                        "#id": "_id"
                    },
                    ExpressionAttributeValues: {
                        ":id": id
                    }

                };

            }

            break

        case 'notes':

            params = {

                TableName: table,
                Key:{
                    "note_id": criteria._id
                }

            };

    }


    console.log("params = " , params);

    var results = [];

    return new Promise((resolve, reject) => {

        docClient.query(params).promise()

            .then((data) => {

//                console.log("GetItem succeeded:", data);

                results = data.Items

//                console.log("results[0] = ", results[0])
                resolve (results);

            })
            .catch( err => {

                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                reject (err);

            });
    });

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