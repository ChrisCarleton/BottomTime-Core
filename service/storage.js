import AWS from 'aws-sdk';
import config from './config';
import log from './logger';

const params = {
	apiVersion: '2006-03-01',
	signatureVersion: 'v4',
	s3ForcePathStyle: true,
	endpoint: config.s3Endpoint === 's3' ? undefined : new AWS.Endpoint(config.s3Endpoint)
};

if (params.endpoint) {
	log.debug('Initializing S3 client with endpoint:', params.endpoint);
} else {
	log.debug('Initializing S3 client with default endpoint.');
}

export default new AWS.S3(params);
