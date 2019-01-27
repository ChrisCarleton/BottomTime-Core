/****************************************************************************************
 *
 * USAGE:
 * npm run kill-sessions (username|.)
 *
 * If not supplied on the command line, mongoDbEndpoint will default to
 * mongodb://localhost/dev
 *
 * username indicates which user's sessions will be terminated. Use * to blow away ALL
 * sessions.
 *
 ***************************************************************************************/

import chalk from 'chalk';
import log from 'fancy-log';
import database from '../service/data/database';
import Session from '../service/data/session';

(async function () {
	const deleteParam = {};
	let username = null;

	if (process.argv.length >= 4) {
		username = process.argv[3];
	}
	
	if (!username) {
		log.error(
			chalk.red(
				'Failed: Username parameter is required. Supply "." as username to terminate ALL sessions.'
			)
		);
		await database.connection.close();
		process.exit(1);
	} else if (username === '.') {
		log('Killing all sessions...');
	} else {
		log(`Killing sessions for ${ chalk.bold(username) }...`);
		deleteParam.username = username.toLowerCase();
	}

	try {
		await Session.deleteMany(deleteParam);
		log('Done.');
	} catch (err) {
		log.error(chalk.red('Failed:', err));
		process.exitCode = 1;
	}
	
	await database.connection.close();
})();
