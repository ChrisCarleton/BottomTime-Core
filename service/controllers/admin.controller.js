import database from '../data/database';

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

export async function GetHealth(req, res) {
	const components = await Promise.all([ GetMongoDbHealth(req) ]);
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
	// This should probably return some Siren or other hypermedia response... meh. Maybe later.
	res.json({
		appVersion: '1.0.0',
		apiVersion: '1.0.0'
	});
}
