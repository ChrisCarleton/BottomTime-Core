import config from '../service/config';
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { ResetPasswordEmail } from '../service/mail/templates';

describe('Templating Engine', () => {

	it('Reset Password Template', done => {
		const message = ResetPasswordEmail(
			'mike.rogers',
			'Mike Rogers',
			'1521ace0-0551-11e9-9679-08606e10bc93');

		fs.readFile(
			path.join(__dirname, 'assets/reset-email.html'),
			'utf8',
			(err, data) => {
				if (err) {
					return done(err);
				}

				expect(message).to.equal(data);
				done();
			});

	});

});
