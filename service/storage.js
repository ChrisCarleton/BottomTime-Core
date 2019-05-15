import AWS from 'aws-sdk';
import config from './config';
import log from './logger';

const init = {
	apiVersion: '2006-03-01',
	signatureVersion: 'v4'
};

if (config.s3Endpoint) {
	log.debug('Initializing S3 client with endpoint:', config.s3Endpoint);
	init.endpoint = new AWS.Endpoint(config.s3Endpoint);
} else {
	log.debug('Initializing S3 client with default endpoint.');
}

const storage = new AWS.S3(init);

export default storage;
