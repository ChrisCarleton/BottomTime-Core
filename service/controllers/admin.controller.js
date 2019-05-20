import config from '../config';
import database from '../data/database';
import search from '../search/search';
import storage from '../storage';

async function GetMongoDbHealth(req) {
	const response = {
		name: 'MongoDB'
	};

	try {
		await database.connection.db.stats();
		return {
			...response,
			health: 'healthy',
			details: 'MongoDB is responding to requests.'
		};
	} catch (err) {
		req.logError('Health check failure.', err);
		return {
			...response,
			health: 'unhealthy',
			details: 'There was a problem connecting to and/or querying the database.'
		};
	}
}

async function GetS3Health(req) {
	const response = {
		name: 'AWS S3'
	};

	try {
		const params = {
			Bucket: config.mediaBucket,
			Key: '__healthcheck',
			Body: new Date().toISOString(),
			StorageClass: 'ONEZONE_IA',
			ServerSideEncryption: 'AES256'
		};
		await storage.putObject(params).promise();

		return {
			...response,
			health: 'healthy',
			details: 'Successfully wrote to S3 bucket.'
		};
	} catch (err) {
		req.logError('S3 health check failure', err);
		return {
			...response,
			health: 'warn',
			details: 'There was a problem writing to S3.'
		};
	}
}

async function GetElasticSearchHealth(req) {
	const response = {
		name: 'ElasticSearch'
	};

	try {
		await search.ping();
		response.health = 'healthy';
		response.details = 'ElasticSearch is responding to requests.';
	} catch (err) {
		req.logError('Failed to ping ElasticSearch', err);
		response.health = 'unhealthy';
		response.details = 'ElasticSearch is not responding to requests.';
	}

	return response;
}

export async function GetHealth(req, res) {
	const components = await Promise.all([
		GetMongoDbHealth(req),
		GetS3Health(req),
		GetElasticSearchHealth(req)
	]);

	let health = 'healthy';
	let status = 200;

	for (let i = 0; i < components.length; i++) {
		if (components[i].health === 'unhealthy') {
			health = 'unhealthy';
			status = 500;
			break;
		}

		if (components[i].health === 'warn') {
			health = 'warn';
		}
	}

	res.status(status).json({
		status: health,
		components
	});
}

export function GetVersion(req, res) {
	res.json({
		appVersion: '1.0.0',
		apiVersion: '1.0.0',
		build: config.buildNumber || '[unknown]',
		region: config.awsRegion || '[unknown]'
	});
}
