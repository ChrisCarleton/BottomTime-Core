import AWS from 'aws-sdk';
import chalk from 'chalk';
import log from 'fancy-log';

const storage = new AWS.S3({
	apiVersion: '2006-03-01',
	signatureVersion: 'v4',
	endpoint: new AWS.Endpoint('http://localhost:4569/')
});

(async () => {
	log('Createing local S3 Buckets...');
	try {
		await storage.createBucket({
			Bucket: 'BottomTime-Media'
		}).promise();
		log('Buckets have been created.');
	} catch (err) {
		log.error(chalk.red(err));
		process.exitCode = 1;
	}
})();
