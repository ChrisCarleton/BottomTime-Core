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
import fakeDiveSite from '../tests/util/fake-dive-site';
import fakeLogEntry from '../tests/util/fake-log-entry';
import fakeUser from '../tests/util/fake-user';
import log from 'fancy-log';
import LogEntry from '../service/data/log-entry';
import Site from '../service/data/sites';
import User from '../service/data/user';

(async () => {
	try {
		const users = _.map(new Array(12), () => new User(fakeUser('bottomtime')));

		await User.insertMany(users);
		const userNames = _.map(users, u => u.username);
		log('Created users: ', userNames);

		log('Checking for admin account...');
		let adminUser = await User.findByUsername('Chris');
		if (adminUser) {
			adminUser.role = 'admin';
			adminUser.isLockedOut = false;
		} else {
			adminUser = new User(fakeUser());
			adminUser.username = 'Chris';
			adminUser.usernameLower = 'chris';
			adminUser.role = 'admin';
		}
		await adminUser.save();
		log(`Admin user ${ chalk.bold.green(adminUser.username) } exists.`);

		log('Creating dive sites...');
		const diveSites = new Array(faker.random.number({ min: 1000, max: 3500 }));
		for (let i = 0; i < diveSites.length; i++) {
			diveSites[i] = new Site(fakeDiveSite(
				faker.random.arrayElement([ null, ...userNames ])
			));
		}
		await Site.insertMany(diveSites);
		log(`Generated ${ chalk.bold(diveSites.length) } dive sites.`);

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
