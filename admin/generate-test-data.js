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
import fakeDiveSite, { toDiveSite } from '../tests/util/fake-dive-site';
import fakeDiveSiteRating, { toDiveSiteRating } from '../tests/util/fake-dive-site-rating';
import fakeLogEntry, { toLogEntry } from '../tests/util/fake-log-entry';
import fakeUser from '../tests/util/fake-user';
import log from 'fancy-log';
import LogEntry from '../service/data/log-entry';
import search from '../service/search';
import Site from '../service/data/sites';
import SiteRating from '../service/data/site-ratings';
import User from '../service/data/user';

(async () => {
	try {
		const users = _.map(new Array(12), () => new User(fakeUser('bottomtime')));

		await User.insertMany(users);
		const userNames = _.map(users, u => u.username);
		const randomUserNames = [ null, ...userNames ];
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
		let ratingsCount = 0;
		for (let i = 0; i < diveSites.length; i++) {
			diveSites[i] = toDiveSite(fakeDiveSite(
				faker.random.arrayElement(randomUserNames)
			));

			let ratings = null;
			let ratingSum = 0;
			ratings = new Array(faker.random.number({ min: 1, max: 300 }));
			for (let j = 0; j < ratings.length; j++) {
				ratings[j] = toDiveSiteRating(
					fakeDiveSiteRating(),
					diveSites[i]._id,
					faker.random.arrayElement(randomUserNames)
				);
				ratingSum += ratings[j].rating;
			}
			diveSites[i].avgRating = ratingSum / ratings.length;

			SiteRating.insertMany(ratings);
			ratingsCount += ratings.length;
		}
		await Site.insertMany(diveSites);
		log(`Generated ${ chalk.bold(diveSites.length) } dive sites`);
		log(`and ${ chalk.bold(ratingsCount) } dive site ratings.`);

		let totalEntries = 0;

		log('Creating a boat-load of log entries...');
		for (let i = 0; i < users.length; i++) {
			let logEntries = new Array(faker.random.number({ min: 50, max: 500 }));
			totalEntries += logEntries.length;
			logEntries = _.map(logEntries, () => toLogEntry(fakeLogEntry(users[i]._id)));
			await LogEntry.insertMany(logEntries);
		}

		log(`Created ${ chalk.bold(totalEntries) } log entries.`);
	} catch (err) {
		log.error(chalk.red(err));
		process.exitCode = 1;
	}

	search.close();
	await database.connection.close();
})();
