/****************************************************************************************
 *
 * USAGE:
 * npm run kill-sessions (username|.)
 *
 * username indicates which user's sessions will be terminated. Use . to blow away ALL
 * sessions.
 *
 ***************************************************************************************/

import chalk from 'chalk';
import log from 'fancy-log';
import database from '../service/data/database';
import Session from '../service/data/session';

(async () => {
	const deleteParam = {};
	let username = null;

	if (process.argv.length >= 4) {
		username = process.argv[3];
	}

	try {
		if (!username) {
			throw new Error('Username parameter is required. Supply "." as username to terminate ALL sessions.');
		} else if (username === '.') {
			log('Killing all sessions...');
		} else {
			log(`Killing sessions for ${ chalk.bold(username) }...`);
			deleteParam.username = username.toLowerCase();
		}

		await Session.deleteMany(deleteParam);
		log('Done.');
	} catch (err) {
		log.error(chalk.red(err));
		process.exitCode = 1;
	}

	await database.connection.close();
})();
