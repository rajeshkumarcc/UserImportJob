import * as AWS from 'aws-sdk';
import Axios from 'axios';
import {APIGatewayEvent, Callback, Context, Handler} from 'aws-lambda';
import {CognitoUserPool, CognitoUserAttribute} from 'amazon-cognito-identity-js';

const REGION = '';
const ACCESS_KEY_ID = '';
const SECRET_ACCESS_KEY = '';
const USER_POOL_ID = '';
const CLIENT_ID = '';
const CLOUD_WATCH_LOG_ROLE_ARN = '';

var poolData = {
  UserPoolId : USER_POOL_ID, // your user pool id here
  ClientId : CLIENT_ID, // your app client id here
};

var userPool = new CognitoUserPool(poolData);

export const bulkSignup: Handler = async (event: APIGatewayEvent, context: Context, callback: Callback) => {

    AWS.config.update({
        region: REGION,
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY
    });

    const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

    // const headerParam = {
    //     UserPoolId: USER_POOL_ID /* required */
    //   };
    //   cognitoidentityserviceprovider.getCSVHeader(headerParam, function(err, data) {
    //     if (err) console.log('Header error: ', err, err.stack); // an error occurred
    //     else     console.log('header---------: ', data);           // successful response
    //   });

    const params = {
        CloudWatchLogsRoleArn: CLOUD_WATCH_LOG_ROLE_ARN, /* required */
        JobName: 'bulkCreate', /* required */
        UserPoolId: USER_POOL_ID /* required */
    };

    cognitoidentityserviceprovider.createUserImportJob(params, async (err: Error, data: Object) => {
        if (err) {
            console.log('Error: ', err.message);
            return;
        } else {
            console.log('PreSignedUrl: ', data[`UserImportJob`][`PreSignedUrl`]);
            const preSignedUrl = data[`UserImportJob`][`PreSignedUrl`];
            const JobId = data[`UserImportJob`]['JobId'];
            try {
                await Axios.put(preSignedUrl, 'headers_new.csv', {headers: {'x-amz-server-side-encryption':'aws:kms'}});

                const params = {
                    JobId, /* required */
                    UserPoolId: USER_POOL_ID /* required */
                };

                cognitoidentityserviceprovider.startUserImportJob(params, function(err, data) {
                    if (err) console.log('Error while starting user import job: ', err, err.stack); // an error occurred
                    else  {
                        console.log('started user import job........');           // successful response
                        console.log('Status: ', data['UserImportJob'][`Status`]);
                        console.log('ImportedUsers: ', data['UserImportJob'][`ImportedUsers`]);
                        console.log('SkippedUsers: ', data['UserImportJob'][`SkippedUsers`]);
                        console.log('FailedUsers: ', data['UserImportJob'][`FailedUsers`]);
                    }
                });

                console.log('file uploaded successfully.............');
                return;
            } catch (e) {
                console.log('Error while uploading csv file: ', e.message);
                return;
            }
        }
    });
};

export const signup: Handler = async (event: APIGatewayEvent, context: Context, callback: Callback) => {

    AWS.config.update({
        region: REGION,
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY
    });

    let attributeList = [];

    const {email, phoneNumber} = JSON.parse(event.body as string);

    const dataEmail = {
        Name : 'email',
        Value : email //'testuser@causecode.com' // your email here
    };
    const dataPhoneNumber = {
        Name : 'phone_number',
        Value : phoneNumber //'9898989898' // your phone number here with +country code and no delimiters in front
    };

    const attributeEmail = new CognitoUserAttribute(dataEmail);
    const attributePhoneNumber = new CognitoUserAttribute(dataPhoneNumber);

    attributeList.push(attributeEmail);
    attributeList.push(attributePhoneNumber);

    let cognitoUser;
    userPool.signUp('testuser@causecode.com', 'password', attributeList, null, function(err, result){
        if (err) {
            console.log('Error: ', err);
            return;
        }
        cognitoUser = result.user;
        console.log('user name is ' + cognitoUser.getUsername());
    });
};
