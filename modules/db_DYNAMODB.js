const uuid = require('uuid/v4');
const randomstring = require('randomstring')


// database connection
const AWS = require("aws-sdk");

AWS.config.update({
    region: "us-east-1",
    endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

AWS.config.setPromisesDependency(null);

const docClient = new AWS.DynamoDB.DocumentClient();



/*
--- notes table ---
Primary partition key: _id (String)
Primary sort key: user_id (String)
GSI: user_id-name-index
Primary partition key: user_id (String)
Primary sort key: name (String)

Note: notes are always read by getAllNotesForUser(req.user.id) using the user_id-name-index GSI


--- users table ---
Primary partition key: _id (String)
Primary sort key: -
GSI: email-index
Primary partition key: email (String)
Primary sort key: -

Note: the email-index GSI is used to check for duplicate email addresses during signup process


--- parameters ---
type: user | note (string, for specifying table as 'users' or 'notes')
criteria: _id, user_id, email, password, name, body (object, for defining query keys, put attributes, etc.)
selection: not used here
options: not used here
updates: email, password, name, body (object, for defining attributes and values to be updated)
*/



// read - returns promise for an array of items
exports.read = (type, criteria, selection = null, options = null) => {

    const table = (type === 'user') ? "users" : "notes";
    const _id = criteria._id;
    const email = criteria.email;
    const user_id = criteria.user_id;

    let params;

    if (table === 'notes') {

        params = {

            TableName: table,
            IndexName: 'user_id-name-index',
            KeyConditionExpression: "user_id = :user_id",
            ExpressionAttributeValues: {
                ":user_id": user_id
            }

        };

    } else if (table === 'users' && !email) {

        params = {

            TableName : table,
            KeyConditionExpression: "#id = :id",
            ExpressionAttributeNames:{
                "#id": "_id"
            },
            ExpressionAttributeValues: {
                ":id": _id
            }

        };

    } else { // search for user by email

        params = {

            TableName : table,
            IndexName: 'email-index',
            KeyConditionExpression: "email = :email",
            ExpressionAttributeValues: {
                ":email": email
            }

        };

    }

    return new Promise((resolve, reject) => {

        docClient.query(params).promise()

            .then((data) => {

                // console.log("DYNAMODB read succeeded:", data.Items);

                resolve (data.Items);

            })
            .catch( err => {

                console.error("DYNAMODB read failed. Error:", err);

                reject (err);

            });
    });

};



// create - returns promise for object containing _id of newly created item
exports.create = (type, criteria, options = null) => {

    const table = (type === 'user') ? "users" : "notes";

    // for creating users
    const email = criteria.email;
    const password = criteria.password;
    const _id = String(uuid());

    // for creating notes
    const note_name = criteria.name;
    const note_body = criteria.body;
    const user_id = criteria.user_id;
    const note_id = randomstring.generate({ length: 24, charset: 'hex' });

    let params;

    if (table === 'users') {

        params = {

            TableName: table,
            Item: {
                "_id": _id,
                "email": email,
                "password": password
            }

        };

    } else {

        params = {

            TableName: table,
            Item: {
                "name": note_name,
                "user_id": user_id,
                "_id": note_id
            }

        };

        if (note_body) {
            params.Item.body = note_body
        }

    }

    return new Promise((resolve, reject) => {

        docClient.put(params).promise()

            .then((data) => {

                // console.log("DYNAMODB create succeeded:", data);

                // provide noteController with _id of new note

                resolve ( { _id: note_id} );

            })
            .catch( err => {

                console.error("DYNAMODB create failed. Error:", err);

                reject (err);

            });

    });

};


// update - returns promise, but only attributes updated are returned, not the full item
exports.update = (type, criteria, updates, options = null) => {

    const table = (type === 'user') ? "users" : "notes";
    const _id = criteria._id;
    const user_id = criteria.user_id;

    // updates for user
    const email_new = updates.email;
    const password_new = updates.password;

    // updates for note
    const note_name = updates.name;
    const note_body = updates.body;

    let params;

    if (table === 'users') {

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

    } else {

        params = {
            TableName: table,
            Key:{
                "_id": _id,
                "user_id": user_id
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

    return new Promise((resolve, reject) => {

        docClient.update(params).promise()

            .then((data) => {

                // console.log("DYNAMODB update succeeded:", data);

                resolve (data.Items);

            })
            .catch( err => {

                console.error("DYNAMODB update failed. Error:", err);

                reject (err);

            });

    });

};



// delete - returns promise, but no data

exports.remove = (type, criteria, options = null) => {

    const table = (type === 'user') ? "users" : "notes";
    const note_id = criteria._id;
    const user_id = criteria.user_id;

    let params;

    if (table === 'users' || note_id) { // delete a user or delete an individual note by note_id

        params = note_id ?
            {TableName: table, Key: {_id: note_id, user_id: user_id}} :
            {TableName: table, Key: {_id: user_id}};

        return new Promise((resolve, reject) => {

            docClient.delete(params).promise()

                .then((data) => {

                    // console.log("DYNAMODB delete user/note succeeded:", data);

                    resolve (data.Items);

                })
                .catch( err => {

                    console.error("DYNAMODB delete user/note failed. Error:", err);

                    reject (err);

                });

        });


    } else {

        params = {

            TableName: 'notes',
            IndexName: 'user_id-name-index',
            KeyConditionExpression: "user_id = :user_id",
            ExpressionAttributeValues: {
                ":user_id": user_id
            }

        };

        return new Promise((resolve, reject) => {

            docClient.query(params).promise()

                .then((notes) => {

                    function deleteAllNotes(notes) {

                        let deletions = notes.map(note => {

                            params = {TableName: table, Key: {_id: note._id, user_id: user_id}}

                            return new Promise((resolve, reject) => {

                                docClient.delete(params).promise()

                                    .then((data) => {

                                        // console.log("DYNAMODB delete all notes: 1 delete succeeded:", data);

                                        resolve (data);

                                    })
                                    .catch( err => {

                                        console.error("DYNAMODB delete all notes: 1 delete failed. Error:", err);

                                        reject (err);

                                    });

                            });

                        });

                        return Promise.all(deletions)

                    }

                    deleteAllNotes(notes.Items)

                        .then( data => {

                            // console.log("DYNAMODB delete all notes succeeded:", data);

                            resolve(data)

                        })

                })
                .catch( err => {

                    console.error("DYNAMODB delete all notes failed. Error:", err);

                    reject (err);

                });

        });

    }


};