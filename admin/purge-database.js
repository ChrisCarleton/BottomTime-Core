/****************************************************************************************
 * 
 * USAGE:
 * gulp purge-database [mongoDbEndpoint]
 * 
 * If not supplied on the command line, mongoDbEndpoint will default to
 * mongodb://localhost/dev
 * 
 ***************************************************************************************/

import config from '../service/config';

if (process.argv[3]) {
	config.mongoEndpoint = process.argv[3];
}

import database from '../service/data/database';
import log from 'fancy-log';
import LogEntry from '../service/data/log-entry';
import Session from '../service/data/session';
import User from '../service/data/user';

module.exports = async function () {
	log(`Using MongoDB endpoint "${ config.mongoEndpoint }"...`);

	try {
		log('Purging DB tables...');
		await Session.deleteMany({});
		await LogEntry.deleteMany({});
		await User.deleteMany({});
		log('Done')
	} catch (err) {
		log.error(err);
		process.exitCode = 1;
	}

	database.connection.close();
};
