import Bluebird from 'bluebird';
import database from '../data/database';
import { logError } from '../logger';

function GetMongoDbHealth() {
	const response = {
		name: 'MongoDB'
	};

	return database.connection.db.stats()
		.then(() => ({
			...response,
			health: 'healthy',
			details: 'MongoDB is responding to requests.'
		}))
		.catch(err => {
			logError('Health check failure.', err);
			return {
				...response,
				health: 'unhealthy',
				details: 'There was a problem connecting to and/or querying the database.'
			};
		});
}

export function GetHealth(req, res) {
	Bluebird.all([ GetMongoDbHealth() ])
		.then(components => {
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
		});
}

export function GetVersion(req, res) {
	// This should probably return some Siren or other hypermedia response... meh. Maybe later.
	res.json({
		appVersion: '1.0.0',
		apiVersion: '1.0.0'
	});
}
