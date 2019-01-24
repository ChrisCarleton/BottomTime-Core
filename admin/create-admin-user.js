/****************************************************************************************
 *
 * USAGE:
 * gulp create-admin-user [mongoDbEndpoint]
 *
 * If not supplied on the command line, mongoDbEndpoint will default to
 * mongodb://localhost/dev
 *
 ***************************************************************************************/

import config from '../service/config';

if (process.argv[3]) {
	config.mongoEndpoint = process.argv[3];
}

import bcrypt from 'bcrypt';
import database from '../service/data/database';
import log from 'fancy-log';
import readline from 'readline-sync';
import User from '../service/data/user';

module.exports = async function () {
	try {
		log(`Using MongoDB endpoint "${ config.mongoEndpoint }"...`);

		let user = await User.findByUsername('Admin');

		if (user) {
			if (!readline.keyInYN(
				'An Admin account already exists in the database. '
				+ 'Would you like to reset the password?'
			)) {
				log('Ok. Exiting.');
				database.connection.close();
				return;
			}
		}

		log('Enter password for Admin account.');

		const password = readline.questionNewPassword();
		const passwordHash = await bcrypt.hash(password, 10);

		if (user) {
			user.passwordHash = passwordHash;
			user.role = 'admin';
			user.isLockedOut = false;
		} else {
			user = new User({
				usernameLower: 'admin',
				emailLower: 'admin@bottomtime.ca',
				username: 'Admin',
				email: 'admin@bottomtime.ca',
				role: 'admin',
				createdAt: Date.now(),
				passwordHash,
				logsVisibility: 'private'
			});
		}

		await user.save();

		log('User "Admin" has been created with administrative privileges.');
		log('Log in with the password you provided above.');
	} catch (err) {
		log.error(err);
		process.exitCode = 1;
	}

	database.connection.close();
};
