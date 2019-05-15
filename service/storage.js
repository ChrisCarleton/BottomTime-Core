import AWS from 'aws-sdk';
import config from './config';
import log from './logger';

const params = {
	apiVersion: '2006-03-01',
	signatureVersion: 'v4'
};

if (config.s3Endpoint) {
	log.debug('Initializing S3 client with endpoint:', config.s3Endpoint);
	params.endpoint = new AWS.Endpoint(config.s3Endpoint);
} else {
	log.debug('Initializing S3 client with default endpoint.');
}

export default new AWS.S3(params);
