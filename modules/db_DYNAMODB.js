const uuid = require('uuid/v4');
const randomstring = require('randomstring')



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
    const user_id = criteria.user_id;

// determine all criteria user for reading notes (e.g., user_id, _id, etc.)
// update case 'notes' to match each scenario
    // read for notes is only called by getAllNotesForUser(req.user.id)
    // DONE : syntax for params
    // to do: return the notes in order (try this using sort key
    // DONE : create GSI on notes table for user_id, with sort order on note_name
    // DONE : populate the notes table with some notes, or get Create Note working

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
                IndexName: 'user_id-name-index',
                KeyConditionExpression: "#user_id = :user_id",
                ExpressionAttributeNames:{
                    "#user_id": "user_id"
                },
                ExpressionAttributeValues: {
                    ":user_id": user_id
                }

            };

    }


    console.log("  params = " , params);

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
exports.create = (type, criteria, options = null) => {

    console.log(`inside db_DYNAMODB create`)

    const table = (type === 'user') ? "users" : "notes";
    const email = criteria.email;
    const password = criteria.password;
    const id = String(uuid());

    let params;

    switch (table) {

        case 'users':

            params = {
                TableName: table,
                Item: {
                    "_id": id,
                    "email": email,
                    "password": password
                }
            };

            break

        case 'notes':

            const note_id = randomstring.generate({
                length: 24,
                charset: 'hex'
            });

            params = {

                TableName: table,
                Key:{
                    "note_id": note_id
                }

            };

    }

    console.log("params = " , params);

    var results = [];

    return new Promise((resolve, reject) => {

        docClient.put(params).promise()

            .then((data) => {

                results = data.Items

                resolve (results);

            })
            .catch( err => {

                console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                reject (err);

            });
    });

};


// update
// Updates one document in the database without returning it.
//   updates: object ({name: 'some name', body: 'some body'})
//   return: promise for raw update

exports.update = (type, criteria, updates, options = null) => {

    const table = (type === 'user') ? "users" : "notes";
    const _id = criteria._id;
    const email_new = updates.email;
    const password_new = updates.password;
    const note_name = updates.name;
    const note_body = updates.body;
    let params;

    switch (table) {

        case 'users':

            const attributeToUpdate = email_new ? 'email' : 'password';
            const updateValue = email_new ? email_new : password_new;

            params = {
                TableName: table,
                Key:{
                    "_id": _id
                },
                UpdateExpression: "set #attributeToUpdate = :updateValue",
                ExpressionAttributeNames:{
                    "#attributeToUpdate": attributeToUpdate
                },
                ExpressionAttributeValues:{
                    ":updateValue": updateValue
                },
                ReturnValues:"UPDATED_NEW"
            };

        break

        case 'notes':

            params = {
                TableName: table,
                Key:{
                    "_id": _id
                },
                UpdateExpression: "set #name = :name, #body = :body",
                ExpressionAttributeNames:{
                    "#name": "name",
                    "#body": "body"
                },
                ExpressionAttributeValues:{
                    ":name": note_name,
                    ":body": note_body
                },
                ReturnValues:"UPDATED_NEW"
            };
    }


    console.log("inside db_DYNAMODB update: params = " , params);

    var results = [];

    return new Promise((resolve, reject) => {

        docClient.update(params).promise()

            .then((data) => {

                console.log("  Update succeeded:", data);

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

// delete
//   return: promise

exports.remove = (type, criteria, options = null) => {

    const table = (type === 'user') ? "users" : "notes";
    const note_id = criteria._id;
    const user_id = criteria.user_id;

    if (note_id) {
        const params = {
            RequestItems: {
                'notes': [
                    {
                        DeleteRequest: {
                            Key: { _id: note_id }
                        }
                    }
                ]
            }
        };
    }

    console.log("inside db_DYNAMODB remove: params = " , params);

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