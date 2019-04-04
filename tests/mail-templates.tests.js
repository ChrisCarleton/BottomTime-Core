import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import {
	ApproveFriendRequestEmail,
	NewFriendRequestEmail,
	RejectFriendRequestEmail,
	ResetPasswordEmail
} from '../service/mail/templates';

function compareFile(file, message, done) {
	fs.readFile(file, 'utf8', (err, data) => {
		if (err) {
			return done(err);
		}

		expect(message).to.equal(data);
		done();
	});
}

describe('Templating Engine', () => {

	it('Reset Password Template', done => {
		const message = ResetPasswordEmail(
			'mike.rogers',
			'Mike Rogers',
			'1521ace0-0551-11e9-9679-08606e10bc93');

		compareFile(
			path.join(__dirname, 'assets/reset-email.html'),
			message,
			done
		);
	});

	it('New Friend Request Template', done => {
		const message = NewFriendRequestEmail(
			'Jimmy McDonnel',
			'jimmydiver64',
			'Timmy McDougal'
		);

		compareFile(
			path.join(__dirname, 'assets/new-friend-request.html'),
			message,
			done
		);
	});

	it('Friend Request Approved Template', done => {
		const message = ApproveFriendRequestEmail(
			'Ronald Duffries',
			's.michaelson',
			'Steve Michaelson'
		);

		compareFile(
			path.join(__dirname, 'assets/friend-request-approved.html'),
			message,
			done
		);
	});

	it('Friend Request Rejected Template', done => {
		const message = RejectFriendRequestEmail(
			'John',
			'Reggie Birkham',
			'I don\'t like you.'
		);

		compareFile(
			path.join(__dirname, 'assets/friend-request-rejected.html'),
			message,
			done
		);
	});
});
