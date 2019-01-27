/****************************************************************************************
 *
 * USAGE:
 * npm run generate-test-data
 *
 * If not supplied on the command line, mongoDbEndpoint will default to
 * mongodb://localhost/dev
 *
 ***************************************************************************************/

import _ from 'lodash';
import chalk from 'chalk';
import database from '../service/data/database';
import faker from 'faker';
import fakeLogEntry from '../tests/util/fake-log-entry';
import fakeUser from '../tests/util/fake-user';
import log from 'fancy-log';
import LogEntry from '../service/data/log-entry';
import User from '../service/data/user';

(async function () {
	try {
		const users = _.map(new Array(12), () => {
			const fake = fakeUser('bottomtime');
			return new User(fake);
		});

		await Promise.all(_.map(users, u => u.save()));
		log('Created users: ', _.map(users, u => u.username));

		const promises = [];
		let totalEntries = 0;

		log('Creating a boat-load of log entries...');
		_.forEach(users, u => {
			let logEntries = new Array(faker.random.number({ min: 7, max: 90 }));
			totalEntries += logEntries.length;
			logEntries = _.map(logEntries, () => {
				/* eslint-disable no-underscore-dangle */
				const entry = new LogEntry(fakeLogEntry(u._id));
				/* eslint-enable no-underscore-dangle */
				return entry;
			});

			for (let i = 0; i < logEntries.length; i++) {
				promises.push(logEntries[i].save());
			}
		});

		await Promise.all(promises);
		log(`Created ${ chalk.bold(totalEntries) } log entries.`);
	} catch (err) {
		log.error(chalk.red(err));
		process.exitCode = 1;
	}

	await database.connection.close();
})();
