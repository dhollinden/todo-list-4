const aws = require('aws-sdk')
const s3 = new aws.S3()


// params: database: (str) dbname, collection: (str) collection name, payload: (obj) data to store
// returns: s3 response as object { ETag: '"hash-of-object"'}
async function putObject({database, collection, payload}) {
    const Bucket = database
    const Prefix = collection
    const Body = JSON.stringify(payload)
    const Key = `${Prefix}/${payload.id}`  //node sdk quirk
    return await s3.putObject({Bucket, Key, Body}).promise()
}

// params: database: (str) dbname, collection: (str) collection name
// returns: JS Object stored at id in collection
async function getObject({database, collection, id}) {
    const Bucket = database
    const Prefix = collection
    const Key = `${Prefix}/${id}`  //node sdk quirk
    return JSON.parse((await s3.getObject({Bucket, Key}).promise()).Body)
}

// params: Collection: (str) collection/Bucket name
// returns: array of object ids (Keys) in collection
async function listIds({database, collection, ContinuationToken = null, pageLimit = Infinity}) {
    const Bucket = database
    const Prefix = collection
    let response = await s3.listObjectsV2({Bucket, Prefix, ContinuationToken}).promise()
    let results = response.Contents
    let pageNumber = 1
    while (response.IsTruncated && pageNumber < pageLimit) {
        response = await s3.listObjectsV2({Bucket, Prefix, ContinuationToken: response.NextContinuationToken}).promise()
        results = results.concat(response.Contents)
        pageNumber++
    }
    return {
        ContinuationToken: response.NextContinuationToken,
        ids:               results.map(result => result.Key)
    }
}


module.exports = {getObject, putObject, listIds}