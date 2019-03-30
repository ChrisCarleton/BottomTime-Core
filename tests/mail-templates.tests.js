import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import {
	ApproveFriendRequestEmail,
	NewFriendRequestEmail,
	ResetPasswordEmail
} from '../service/mail/templates';

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

	it('New Friend Request Template', done => {
		const message = NewFriendRequestEmail(
			'Jimmy McDonnel',
			'jimmydiver64',
			'Timmy McDougal'
		);

		fs.readFile(
			path.join(__dirname, 'assets/new-friend-request.html'),
			'utf8',
			(err, data) => {
				if (err) {
					return done(err);
				}

				expect(message).to.equal(data);
				done();
			}
		);
	});

	it('Friend Request Approved Template', done => {
		const message = ApproveFriendRequestEmail(
			'Ronald Duffries',
			's.michaelson',
			'Steve Michaelson'
		);

		fs.readFile(
			path.join(__dirname, 'assets/friend-request-approved.html'),
			'utf8',
			(err, data) => {
				if (err) {
					return done(err);
				}

				expect(data).to.equal(message);
				done();
			});
	});

});
