/****************************************************************************************
 * 
 * USAGE:
 * gulp test-data [mongoDbEndpoint]
 * 
 * If not supplied on the command line, mongoDbEndpoint will default to
 * mongodb://localhost/dev
 * 
 ***************************************************************************************/

import config from '../service/config';

if (process.argv[3]) {
	config.mongoEndpoint = process.argv[3];
}

import _ from 'lodash';
import database from '../service/data/database';
import faker from 'faker';
import fakeLogEntry from '../tests/util/fake-log-entry';
import fakeUser from '../tests/util/fake-user';
import log from 'fancy-log';
import LogEntry from '../service/data/log-entry';
import User from '../service/data/user';

module.exports = async function() {
	try {
		log(`Using MongoDB endpoint "${ config.mongoEndpoint }"...`);

		let users = new Array(7);
		users = _.map(users, u => {
			const fake = fakeUser('bottomtime');
			return new User(fake);
		});

		await Promise.all(_.map(users, u => u.save()));
		log('Created users: ', _.map(users, u => u.username));
		
		let totalEntries = 0;
		log('Creating a boat-load of log entries...');
		users.forEach(async u => {
			let logEntries = new Array(faker.random.number({ min: 7, max: 90 }));
			totalEntries += logEntries.length;
			logEntries = _.map(logEntries, e => {
				const fake = fakeLogEntry(u.id);
				return new LogEntry(fake);
			});

			await Promise.all(_.map(logEntries, e => e.save()));
		});
		log(`Created ${ totalEntries } log entries.`);
	} catch (err) {
		console.error(err);
	}

	database.connection.close();
}
