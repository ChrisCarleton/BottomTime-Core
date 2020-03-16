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
import fs from 'fs';
import log from 'fancy-log';
import LogEntry from '../service/data/log-entry';
import mapLimit from 'async/mapLimit';
import path from 'path';
import search from '../service/search';
import Site from '../service/data/sites';
import SiteRating from '../service/data/site-ratings';
import User from '../service/data/user';

(async () => {
	try {
		const users = _.map(
			new Array(faker.random.number({ min: 200, max: 400 })),
			() => new User(fakeUser('bottomtime'))
		);

		await User.insertMany(users);
		const userNames = _.map(users, u => u.username);
		const randomUserNames = [ null, ...userNames ];
		log('Created users: ', userNames);

		const usersFileName = path.resolve(__dirname, '../.test-users.json');
		fs.writeFile(
			usersFileName,
			`${ JSON.stringify(userNames, null, '  ') }\n`,
			err => {
				if (err) {
					return log.error('Failed to save user names file:', err);
				}

				log(`User names saved to ${ chalk.bold(usersFileName) }`);
			}
		);

		log('Checking for admin account...');
		let adminUser = await User.findByUsername('Chris');
		if (adminUser) {
			adminUser.role = 'admin';
			adminUser.isLockedOut = false;
		} else {
			adminUser = new User(fakeUser('bottomtime'));
			adminUser.username = 'Chris';
			adminUser.usernameLower = 'chris';
			adminUser.role = 'admin';
		}
		await adminUser.save();
		await User.esSynchronize();
		log(`Admin user ${ chalk.bold.green(adminUser.username) } exists.`);

		log('Creating dive sites and ratings (this could take a while)...');

		let diveSiteRatingsCount = 0;
		let diveSitesCount = 0;

		await mapLimit(users, 20, async (u, cb) => {
			const diveSites = _.map(
				new Array(faker.random.number({ min: 4, max: 40 })),
				() => toDiveSite(fakeDiveSite(u.username))
			);

			diveSitesCount += diveSites.length;

			let diveSiteRatingsArray = [];
			diveSites.forEach(s => {
				let ratingsSum = 0;
				const ratings = _.map(
					new Array(faker.random.number({ min: 1, max: 300 })),
					() => {
						const rating = toDiveSiteRating(
							fakeDiveSiteRating(),
							s._id,
							faker.random.arrayElement(randomUserNames)
						);
						ratingsSum += rating.rating;
						return rating;
					}
				);
				diveSiteRatingsArray = diveSiteRatingsArray.concat(ratings);
				s.avgRating = ratingsSum / ratings.length;
				diveSiteRatingsCount += ratings.length;
			});

			try {
				await Promise.all([
					await Site.insertMany(diveSites),
					await SiteRating.insertMany(diveSiteRatingsArray)
				]);

				return cb();
			} catch (err) {
				return cb(err);
			}
		});

		log(`Generated ${ chalk.bold(diveSitesCount) } dive sites`);
		log(`and ${ chalk.bold(diveSiteRatingsCount) } dive site ratings.`);

		log('Syncing ES...');
		await Site.esSynchronize();
		log('Done');

		let totalEntries = 0;

		log('Creating a boat-load of log entries (this could take a while)...');
		for (let i = 0; i < users.length; i++) {
			const logEntries = _.map(
				new Array(faker.random.number({ min: 50, max: 500 })),
				() => toLogEntry(fakeLogEntry(users[i]._id))
			);
			totalEntries += logEntries.length;
			await LogEntry.insertMany(logEntries);
		}

		log(`Created ${ chalk.bold(totalEntries) } log entries.`);

		// Will need this when we start indexing log entries:
		// log('Syncing ES...');
		// await LogEntry.esSynchronize();
		// log('Done');
	} catch (err) {
		log.error(chalk.red(err));
		process.exitCode = 1;
	}

	search.close();
	await database.connection.close();
})();
