const chalk = require('chalk');
import database from '../service/data/database';
import search from '../service/search';

(async () => {
	console.log('Starting synchronization (this could take a while)...');
	try {
		console.log(chalk.italic(' * Users'));
		await require('../service/data/user').esSynchronize();
		console.log(chalk.italic(' * Dive sites'));
		await require('../service/data/sites').esSynchronize();
		console.log(chalk.italic(' * Dive log entries'));
		await require('../service/data/log-entry').esSynchronize();
	} catch (err) {
		console.log(chalk.red('Failed to synchronize MongoDB with ElasticSearch:', err.stack));
	}
	console.log('Closing connections...');
	await Promise.all([
		database.connection.close(),
		search.close()
	]);
	console.log('Done!');
})();
