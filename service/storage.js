import AWS from 'aws-sdk';
import config from './config';

const init = {
	apiVersion: '2006-03-01',
	signatureVersion: 'v4'
};

if (config.s3Endpoint) {
	init.endpoint = new AWS.Endpoint(config.s3Endpoint);
}

const storage = new AWS.S3(init);

export default storage;
