import { App } from '../../service/server';
import Bluebird from 'bluebird';
import createAccount from '../util/create-fake-account';
import { expect, request } from 'chai';
import fakeLogEntry from '../util/fake-log-entry';
import LogEntry from '../../service/data/log-entry';

describe('Log Entry Security', () => {
	let admin = null;
	let user1 = null;
	let user2 = null;
	let user3 = null;

	before(done => {
		Bluebird
			.all([
				createAccount('admin'),
				createAccount(),
				createAccount('user', 'friends-only'),
				createAccount('user', 'private')
			])
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
		it('Returns Not Found if user does not exist', done => {
			const fake = fakeLogEntry(user1.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => {
					return admin
						.agent
						.get(`/users/not_a_user/logs/${ entity.id }`)
				})
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					done();
				})
				.catch(done);
		});

		it('Returns Not Found if log entry does not belong to the specified user', done => {
			const fake = fakeLogEntry(user1.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => {
					return admin
						.agent
						.get(`/users/${ user2.user.username }/logs/${ entity.id }`)
				})
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					done();
				})
				.catch(done);
		});

		it('Returns Not Found if log entry does not exist', done => {
			const fake = fakeLogEntry(user1.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => {
					return admin
						.agent
						.get(`/users/${ user2.user.username }/logs/9d0f6ea0d0bc16aaef4e6de3`)
				})
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					done();
				})
				.catch(done);
		});

		it('Anonymous users can view logs when log books are public', done => {
			const fake = fakeLogEntry(user1.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => {
					fake.entryId = entity.id;
					delete fake.userId;
					return request(App).get(`/users/${ user1.user.username }/logs/${ entity.id }`);
				})
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body).to.eql(fake);
					done();
				})
				.catch(done);
		});

		it('Anonymous users cannot view logs when log books are friends-only', done => {
			const fake = fakeLogEntry(user2.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => request(App).get(`/users/${ user2.user.username }/logs/${ entity.id }`))
				.then(res => {
					expect(res.status).to.equal(403);
					expect(res.body.status).to.equal(403);
					done();
				})
				.catch(done);
		});

		it('Anonmyous users cannot view logs when log books are private', done => {
			const fake = fakeLogEntry(user3.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => request(App).get(`/users/${ user3.user.username }/logs/${ entity.id }`))
				.then(res => {
					expect(res.status).to.equal(403);
					expect(res.body.status).to.equal(403);
					done();
				})
				.catch(done);
		});

		it('Admins can view logs when log books are private', done => {
			const fake = fakeLogEntry(user3.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => {
					fake.entryId = entity.id;
					delete fake.userId;
					return admin.agent.get(`/users/${ user3.user.username }/logs/${ entity.id }`);
				})
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body).to.eql(fake);
					done();
				})
				.catch(done);
		});

		it('Admins can view logs when log books are friends-only', done => {
			const fake = fakeLogEntry(user2.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => {
					fake.entryId = entity.id;
					delete fake.userId;
					return admin.agent.get(`/users/${ user2.user.username }/logs/${ entity.id }`);
				})
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body).to.eql(fake);
					done();
				})
				.catch(done);
		});

		it('Admins can view logs when log books are public', done => {
			const fake = fakeLogEntry(user1.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => {
					fake.entryId = entity.id;
					delete fake.userId;
					return admin.agent.get(`/users/${ user1.user.username }/logs/${ entity.id }`);
				})
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body).to.eql(fake);
					done();
				})
				.catch(done);
		});

		it('Users can view logs when log books are pulbic', done => {
			const fake = fakeLogEntry(user1.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => {
					fake.entryId = entity.id;
					delete fake.userId;
					return user2.agent.get(`/users/${ user1.user.username }/logs/${ entity.id }`);
				})
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body).to.eql(fake);
					done();
				})
				.catch(done);
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
			const fake = fakeLogEntry(user3.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => user1.agent.get(`/users/${ user3.user.username }/logs/${ entity.id }`))
				.then(res => {
					expect(res.status).to.equal(403);
					expect(res.body.status).to.equal(403);
					done();
				})
				.catch(done);
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
