/* eslint no-process-exit: 0, no-process-env: 0 */

import AWS from 'aws-sdk';
import chalk from 'chalk';
import { Client } from '@elastic/elasticsearch';
import config from '../service/config';
import log from 'fancy-log';
import mongoose from '../service/data/database';
import request from 'supertest';

const storage = new AWS.S3({
	apiVersion: '2006-03-01',
	signatureVersion: 'v4',
	endpoint: new AWS.Endpoint(process.env.BT_S3_ENDPOINT || 'http://localhost:4569/')
});

let esClient = null;

function sleep(duration) {
	return new Promise(resolve => setTimeout(resolve, duration));
}

(async () => {
	log('Creating S3 Buckets...');
	try {
		let bucketExists = false;
		try {
			await storage.headBucket({ Bucket: config.mediaBucket }).promise();
			bucketExists = true;
		} catch (err) {}

		if (!bucketExists) {
			await storage.createBucket({ Bucket: config.mediaBucket }).promise();
		}
		log('Buckets have been created.');

		log('Attempting to connect to ElasticSearch...');
		for (let i = 0; i < 10; i++) {
			try {
				await request(config.elasticSearchEndpoint).get('/').expect(200);
			} catch (err) {
				log(`Connection unavailable. Attempting ${ chalk.bold(9 - i) } more times...`);
				if (i === 9) {
					return process.exit(5);
				}
				await sleep(2000);
			}
		}

		log('Creating ElasticSearch indices...');
		esClient = new Client({
			log: 'debug',
			node: config.elasticSearchEndpoint
		});

		const indices = [ '_sites', '_users', '_dive_logs' ];
		for (let i = 0; i < indices.length; i++) {
			const index = `${ config.elasticSearchIndex }${ indices[i] }`;
			log(' *', index);
			const exists = await esClient.indices.exists({ index });

			if (!exists.body) {
				await esClient.indices.create({ index });
			} else {
				log('   (already exists)');
			}
		}

        // Types have been deprecated. No longer used in ES7+.
		// log('Creating ElasticSearch types...');
		// await require('../service/data/sites').esCreateMapping();
		// await require('../service/data/user').esCreateMapping();
		// await require('../service/data/log-entry').esCreateMapping();
		// log('ElasticSearch has been initialized.');

	} catch (err) {
		log.error(chalk.red(err), err.stack);
		process.exitCode = 1;
	} finally {
		log('Closing connections...');
		esClient.close();
		require('../service/search').close();
		mongoose.connection.close();
	}
})();
