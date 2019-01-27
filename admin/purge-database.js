/****************************************************************************************
 *
 * USAGE:
 * npm run purge-database
 *
 ***************************************************************************************/

import chalk from 'chalk';
import database from '../service/data/database';
import log from 'fancy-log';
import LogEntry from '../service/data/log-entry';
import readline from 'readline-sync';
import Session from '../service/data/session';
import User from '../service/data/user';

(async function () {
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
			Session.deleteMany({}),
			LogEntry.deleteMany({}),
			User.deleteMany({})
		]);
		log('Done.');
	} catch (err) {
		log.error(chalk.red(err));
		process.exitCode = 1;
	}

	await database.connection.close();
})();
