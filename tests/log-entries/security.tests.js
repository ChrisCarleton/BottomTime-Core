import Bluebird from 'bluebird';
import createAccount from '../util/create-fake-account';

describe('Log Entry Security', () => {
	let admin = null;
	let user1 = null;
	let user2 = null;
	let user3 = null;

	before(done => {
		Bluebird.all([ createAccount('admin'), createAccount(), createAccount(), createAccount() ])
			.then(results => {
				[ admin, user1, user2, user3 ] = results;
				done();
			})
			.catch(done);
	});

	after(() => {
		admin.agent.close();
		user1.agent.close();
		user2.agent.close();
		user3.agent.close();
	});

	describe('GET /users/:username/logs/:logId', () => {
		it('Anonymous users can view logs when log books are public.', done => {
			done();
		});

		it('Anonymous users cannot view logs when log books are friends-only', done => {
			done();
		});

		it('Anonmyous users cannot view logs when log books are private', done => {
			done();
		});

		it('Admins can view logs when log books are private', done => {
			done();
		});

		it('Admins can view logs when log books are friends-only', done => {
			done();
		});

		it('Admins can view logs when log books are public', done => {
			done();
		});

		it('Users can view logs when log books are pulbic', done => {
			done();
		});

		it('Users can view logs from friends\' "friends-only" log book', done => {
			// TODO: Make the 'friending' logic.
			done();
		});

		it('Users cannot view logs from "friends-only" log books when they are not friended', done => {
			// TODO: Make the 'friending' logic.
			done();
		});

		it('Users cannot view logs from private log books', done => {
			done();
		});
	});

	describe('PUT /users/:username/logs/:logId', () => {
		it('Anonymous users cannot put logs in any log books', done => {
			done();
		});

		it('Admins can put logs in other user\'s log books', done => {
			done();
		});

		it('Users cannot put logs in other user\'s log books', done => {
			done();
		});
	});

	describe('DELETE /users/:username/logs/:logId', () => {
		it('Anonymous users cannot delete logs from any log books', done => {
			done();
		});

		it('Admins can delete logs from other user\'s log books', done => {
			done();
		});

		it('Users cannot delete logs from other user\'s log books', done => {
			done();
		});
	});

	describe('POST /users/:username/logs', () => {
		it('Anonymous users cannot upload logs', done => {
			done();
		});

		it('Admins can upload logs to any user\'s log book', done => {
			done();
		});

		it('Users cannot upload logs to other user\'s log books', done => {
			done();
		});
	});

	describe('PUT /users/:username/logs', () => {
		it('Anonymous users cannot upload logs', done => {
			done();
		});

		it('Admins can upload logs to any user\'s log book', done => {
			done();
		});

		it('Users cannot upload logs to other user\'s log books', done => {
			done();
		});
	});

	describe('DELETE /users/:username/logs', () => {
		it('Anonymous users cannot delete logs', done => {
			done();
		});

		it('Admins can delete logs from any user\'s log book', done => {
			done();
		});

		it('Users cannot delete logs from other user\'s log books', done => {
			done();
		});
	});
});
