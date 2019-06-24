/****************************************************************************************
 *
 * USAGE:
 * npm run purge-database
 *
 ***************************************************************************************/

import chalk from 'chalk';
import database from '../service/data/database';
import Friend from '../service/data/friend';
import log from 'fancy-log';
import LogEntry from '../service/data/log-entry';
import readline from 'readline-sync';
import Session from '../service/data/session';
import Site from '../service/data/sites';
import SiteRating from '../service/data/site-ratings';
import Tank from '../service/data/tanks';
import User from '../service/data/user';

(async () => {
	try {
		if (!readline.keyInYN(
			'This operation will totally destroy all data in the database. Are you sure you want to proceed?'
		)) {
			log('Exiting.');
			await database.connection.close();
			return;
		}

		log('Purging DB tables...');
		await Promise.all([
			Tank.deleteMany({}),
			Friend.deleteMany({}),
			Session.deleteMany({}),
			LogEntry.deleteMany({}),
			Site.deleteMany({}),
			SiteRating.deleteMany({}),
			User.deleteMany({})
		]);
		log('Done.');
	} catch (err) {
		log.error(chalk.red(err));
		process.exitCode = 1;
	}

	await database.connection.close();
})();
