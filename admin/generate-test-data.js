/****************************************************************************************
 *
 * USAGE:
 * npm run generate-test-data
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

(async () => {
	try {
		const users = _.map(new Array(12), () => new User(fakeUser('bottomtime')));

		await User.insertMany(users);
		log('Created users: ', _.map(users, u => u.username));

		let totalEntries = 0;

		log('Creating a boat-load of log entries...');
		for (let i = 0; i < users.length; i++) {
			let logEntries = new Array(faker.random.number({ min: 50, max: 300 }));
			totalEntries += logEntries.length;
			logEntries = _.map(logEntries, () => new LogEntry(fakeLogEntry(users[i]._id)));
			await LogEntry.insertMany(logEntries);
		}

		log(`Created ${ chalk.bold(totalEntries) } log entries.`);
	} catch (err) {
		log.error(chalk.red(err));
		process.exitCode = 1;
	}

	await database.connection.close();
})();
