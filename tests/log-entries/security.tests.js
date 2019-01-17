import _ from 'lodash';
import { App } from '../../service/server';
import createAccount from '../util/create-fake-account';
import { ErrorIds } from '../../service/utils/error-response';
import { expect, request } from 'chai';
import fakeLogEntry from '../util/fake-log-entry';
import fakeMongoId from '../util/fake-mongo-id';
import LogEntry from '../../service/data/log-entry';
import User from '../../service/data/user';

describe('Log Entry Security', () => {
	let admin = null;
	let user1 = null;
	let user2 = null;
	let user3 = null;

	before(done => {
		Promise
			.all([
				createAccount('admin'),
				createAccount('user', 'public'),
				createAccount('user', 'friends-only'),
				createAccount('user', 'private')
			])
			.then(results => {
				[ admin, user1, user2, user3 ] = results;
				done();
			})
			.catch(done);
	});

	after(done => {
		admin.agent.close();
		user1.agent.close();
		user2.agent.close();
		user3.agent.close();
		User.deleteMany({}, done);
	});

	afterEach(done => {
		LogEntry.deleteMany({}, done);
	});

	describe('GET /users/:username/logs/:logId', () => {
		it('Returns Not Found if user does not exist', done => {
			const fake = fakeLogEntry(user1.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => admin
					.agent
					.get(`/users/not_a_user/logs/${ entity.id }`))
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
				.then(entity => admin
					.agent
					.get(`/users/${ user2.user.username }/logs/${ entity.id }`))
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					done();
				})
				.catch(done);
		});

		it('Returns Not Found if log entry does not exist', done => {
			admin.agent.get(`/users/${ user2.user.username }/logs/${ fakeMongoId() }`)
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

		it('Users can view their own private logs', done => {
			const fake = fakeLogEntry(user3.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => {
					fake.entryId = entity.id;
					delete fake.userId;
					return user3.agent.get(`/users/${ user3.user.username }/logs/${ entity.id }`);
				})
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body).to.eql(fake);
					done();
				})
				.catch(done);
		});

		it('Users can view their own friends-only logs', done => {
			const fake = fakeLogEntry(user2.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => {
					fake.entryId = entity.id;
					delete fake.userId;
					return user2.agent.get(`/users/${ user2.user.username }/logs/${ entity.id }`);
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

		it('Users can view logs when log books are public', done => {
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

		it.skip('Users can view logs from friends\' "friends-only" log book', done => {
			// TODO: Make the 'friending' logic.
			done();
		});

		it.skip('Users cannot view logs from "friends-only" log books when they are not friended', done => {
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

		it('Returns Not Found if user does not exist', done => {
			admin.agent.put(`/users/not_a_user/logs/${ fakeMongoId() }`)
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
				.then(entity => admin
					.agent
					.put(`/users/${ user2.user.username }/logs/${ entity.id }`))
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
				.then(() => admin
					.agent
					.put(`/users/${ user2.user.username }/logs/${ fakeMongoId() }`))
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					done();
				})
				.catch(done);
		});

		it('Returns Not Found if user does not exist', done => {
			const fake = fakeLogEntry(user3.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => user3.agent
					.put(`/users/not_a_user/logs/${ entity.id }`)
					.send(fake))
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					expect(res.body.errorId).to.equal(ErrorIds.notFound);
					done();
				})
				.catch(done);
		});

		it('Returns Not Found if log entry does not exist', done => {
			const fake = fakeLogEntry();

			user3.agent
				.put(`/users/${ user3.user.username }/logs/${ fakeMongoId() }`)
				.send(fake)
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					expect(res.body.errorId).to.equal(ErrorIds.notFound);
					done();
				})
				.catch(done);
		});

		it('Returns Not Found if log entry does not belong to specified user', done => {
			const fake = fakeLogEntry(user3.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => user1.agent
					.put(`/users/${ user1.user.username }/logs/${ entity.id }`)
					.send(fake))
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					expect(res.body.errorId).to.equal(ErrorIds.notFound);
					done();
				})
				.catch(done);

		});

		it('Anonymous users cannot put logs in any log books', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user3.user.id),
				fakeLogEntry(admin.user.id)
			];

			Promise.all(_.map(fakes, f => new LogEntry(f).save()))
				.then(entries => {
					fakes.forEach(f => {
						delete f.userId;
					});

					return Promise.all([
						request(App)
							.put(`/users/${ user1.user.username }/logs/${ entries[0].id }`)
							.send(fakes[0]),
						request(App)
							.put(`/users/${ user2.user.username }/logs/${ entries[1].id }`)
							.send(fakes[1]),
						request(App)
							.put(`/users/${ user3.user.username }/logs/${ entries[2].id }`)
							.send(fakes[2]),
						request(App)
							.put(`/users/${ admin.user.username }/logs/${ entries[3].id }`)
							.send(fakes[3])
					]);
				})
				.then(res => {
					res.forEach(r => {
						expect(r.status).to.equal(403);
						expect(r.body.status).to.equal(403);
						expect(r.body.errorId).to.equal(ErrorIds.forbidden);
					});
					done();
				})
				.catch(done);
		});

		it('Admins can put logs in other user\'s log books', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user3.user.id)
			];

			Promise.all(_.map(fakes, f => new LogEntry(f).save()))
				.then(entries => {
					fakes.forEach(f => {
						delete f.userId;
					});

					return Promise.all([
						admin.agent
							.put(`/users/${ user1.user.username }/logs/${ entries[0].id }`)
							.send(fakes[0]),
						admin.agent
							.put(`/users/${ user2.user.username }/logs/${ entries[1].id }`)
							.send(fakes[1]),
						admin.agent
							.put(`/users/${ user3.user.username }/logs/${ entries[2].id }`)
							.send(fakes[2])
					]);
				})
				.then(res => {
					for (let i = 0; i < fakes.length; i++) {
						expect(res[i].status).to.equal(200);
					}
					done();
				})
				.catch(done);
		});

		it('Users cannot put logs in other user\'s log books', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(admin.user.id)
			];

			Promise.all(_.map(fakes, f => new LogEntry(f).save()))
				.then(entries => {
					fakes.forEach(f => {
						delete f.userId;
					});

					return Promise.all([
						user3.agent
							.put(`/users/${ user1.user.username }/logs/${ entries[0].id }`)
							.send(fakes[0]),
						user3.agent
							.put(`/users/${ user2.user.username }/logs/${ entries[1].id }`)
							.send(fakes[1]),
						user3.agent
							.put(`/users/${ admin.user.username }/logs/${ entries[2].id }`)
							.send(fakes[2])
					]);
				})
				.then(res => {
					res.forEach(r => {
						expect(r.status).to.equal(403);
						expect(r.body.status).to.equal(403);
						expect(r.body.errorId).to.equal(ErrorIds.forbidden);
					});
					done();
				})
				.catch(done);
		});
	});

	describe('DELETE /users/:username/logs/:logId', () => {

		it('Returns Not Found if user does not exist', done => {
			admin.agent.del(`/users/not_a_user/logs/${ fakeMongoId() }`)
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
				.then(entity => admin
					.agent
					.del(`/users/${ user2.user.username }/logs/${ entity.id }`))
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					done();
				})
				.catch(done);
		});

		it('Returns Not Found if log entry does not exist', done => {
			admin.agent.del(`/users/${ user2.user.username }/logs/${ fakeMongoId() }`)
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					done();
				})
				.catch(done);
		});

		it('Returns Not Found if user does not exist', done => {
			const fake = fakeLogEntry(user3.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => user3.agent
					.del(`/users/not_a_user/logs/${ entity.id }`)
					.send(fake))
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					expect(res.body.errorId).to.equal(ErrorIds.notFound);
					done();
				})
				.catch(done);
		});

		it('Returns Not Found if log entry does not exist', done => {
			const fake = fakeLogEntry();

			user3.agent
				.del(`/users/${ user3.user.username }/logs/${ fakeMongoId() }`)
				.send(fake)
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					expect(res.body.errorId).to.equal(ErrorIds.notFound);
					done();
				})
				.catch(done);
		});

		it('Returns Not Found if log entry does not belong to specified user', done => {
			const fake = fakeLogEntry(user3.user.id);
			const logEntry = new LogEntry(fake);

			logEntry.save()
				.then(entity => user1.agent
					.del(`/users/${ user1.user.username }/logs/${ entity.id }`)
					.send(fake))
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					expect(res.body.errorId).to.equal(ErrorIds.notFound);
					done();
				})
				.catch(done);

		});

		it('Anonymous users cannot delete logs from any log books', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user3.user.id),
				fakeLogEntry(admin.user.id)
			];

			Promise.all(_.map(fakes, f => new LogEntry(f).save()))
				.then(entries => {
					fakes.forEach(f => {
						delete f.userId;
					});

					return Promise.all([
						request(App)
							.del(`/users/${ user1.user.username }/logs/${ entries[0].id }`)
							.send(fakes[0]),
						request(App)
							.del(`/users/${ user2.user.username }/logs/${ entries[1].id }`)
							.send(fakes[1]),
						request(App)
							.del(`/users/${ user3.user.username }/logs/${ entries[2].id }`)
							.send(fakes[2]),
						request(App)
							.del(`/users/${ admin.user.username }/logs/${ entries[3].id }`)
							.send(fakes[3])
					]);
				})
				.then(res => {
					res.forEach(r => {
						expect(r.status).to.equal(403);
						expect(r.body.status).to.equal(403);
						expect(r.body.errorId).to.equal(ErrorIds.forbidden);
					});
					done();
				})
				.catch(done);
		});

		it('Admins can delete logs from other user\'s log books', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user3.user.id)
			];

			Promise.all(_.map(fakes, f => new LogEntry(f).save()))
				.then(entries => {
					fakes.forEach(f => {
						delete f.userId;
					});

					return Promise.all([
						admin.agent
							.del(`/users/${ user1.user.username }/logs/${ entries[0].id }`)
							.send(fakes[0]),
						admin.agent
							.del(`/users/${ user2.user.username }/logs/${ entries[1].id }`)
							.send(fakes[1]),
						admin.agent
							.del(`/users/${ user3.user.username }/logs/${ entries[2].id }`)
							.send(fakes[2])
					]);
				})
				.then(res => {
					for (let i = 0; i < fakes.length; i++) {
						expect(res[i].status).to.equal(204);
					}
					done();
				})
				.catch(done);
		});

		it('Users cannot delete logs from other user\'s log books', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(admin.user.id)
			];

			Promise.all(_.map(fakes, f => new LogEntry(f).save()))
				.then(entries => {
					fakes.forEach(f => {
						delete f.userId;
					});

					return Promise.all([
						user3.agent
							.del(`/users/${ user1.user.username }/logs/${ entries[0].id }`)
							.send(fakes[0]),
						user3.agent
							.del(`/users/${ user2.user.username }/logs/${ entries[1].id }`)
							.send(fakes[1]),
						user3.agent
							.del(`/users/${ admin.user.username }/logs/${ entries[2].id }`)
							.send(fakes[2])
					]);
				})
				.then(res => {
					res.forEach(r => {
						expect(r.status).to.equal(403);
						expect(r.body.status).to.equal(403);
						expect(r.body.errorId).to.equal(ErrorIds.forbidden);
					});
					done();
				})
				.catch(done);
		});
	});

	describe('POST /users/:username/logs', () => {

		it('Returns Not Found if user does not exist', done => {
			const fakes = [
				fakeLogEntry(),
				fakeLogEntry()
			];

			admin.agent
				.post('/users/not_a_user/logs')
				.send(fakes)
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					expect(res.body.errorId).to.equal(ErrorIds.notFound);

					return user1.agent
						.post('/users/not_a_user/logs')
						.send(fakes);
				})
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					expect(res.body.errorId).to.equal(ErrorIds.notFound);
					done();
				})
				.catch(done);
		});

		it('Anonymous users cannot upload logs', done => {
			const fakes = [
				fakeLogEntry(),
				fakeLogEntry()
			];

			Promise.all(
				[
					request(App).post(`/users/${ user1.user.username }/logs`).send(fakes),
					request(App).post(`/users/${ user2.user.username }/logs`).send(fakes),
					request(App).post(`/users/${ user3.user.username }/logs`).send(fakes),
					request(App).post(`/users/${ admin.user.username }/logs`).send(fakes)
				])
				.then(res => {
					res.forEach(r => {
						expect(r.status).to.equal(403);
						expect(r.body.status).to.equal(403);
						expect(r.body.errorId).to.equal(ErrorIds.forbidden);
					});
					done();
				})
				.catch(done);
		});

		it('Admins can upload logs to any user\'s log book', done => {
			const fakes = [
				fakeLogEntry(),
				fakeLogEntry()
			];

			Promise.all(
				[
					admin.agent.post(`/users/${ user1.user.username }/logs`).send(fakes),
					admin.agent.post(`/users/${ user2.user.username }/logs`).send(fakes),
					admin.agent.post(`/users/${ user3.user.username }/logs`).send(fakes),
					admin.agent.post(`/users/${ admin.user.username }/logs`).send(fakes)
				])
				.then(res => {
					delete fakes[0].userId;
					delete fakes[1].userId;

					for (let i = 0; i < 4; i++) {
						expect(res[i].status).to.equal(201);
						expect(res[i].body).to.be.an('Array');

						res[i].body.forEach(e => {
							expect(e.entryId).to.match(/^[0-9a-f]{24}$/i);
							delete e.entryId;
						});

						expect(res[i].body).to.eql(fakes);
					}

					done();
				})
				.catch(done);
		});

		it('Users cannot upload logs to other users\' log books', done => {
			const fakes = [
				fakeLogEntry(),
				fakeLogEntry()
			];

			Promise.all(
				[
					user1.agent.post(`/users/${ user2.user.username }/logs`).send(fakes),
					user1.agent.post(`/users/${ user3.user.username }/logs`).send(fakes),
					user1.agent.post(`/users/${ admin.user.username }/logs`).send(fakes)
				])
				.then(res => {
					res.forEach(r => {
						expect(r.status).to.equal(403);
						expect(r.body.status).to.equal(403);
						expect(r.body.errorId).to.equal(ErrorIds.forbidden);
					});
					done();
				})
				.catch(done);
		});
	});

	describe('PUT /users/:username/logs', () => {

		it('Returns Not Found if user does not exist', done => {
			const fakes = [
				fakeLogEntry(fakeMongoId()),
				fakeLogEntry(fakeMongoId())
			];

			admin.agent
				.put('/users/not_a_user/logs')
				.send(fakes)
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					expect(res.body.errorId).to.equal(ErrorIds.notFound);

					return user1.agent
						.post('/users/not_a_user/logs')
						.send(fakes);
				})
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					expect(res.body.errorId).to.equal(ErrorIds.notFound);
					done();
				})
				.catch(done);
		});

		it('Anonymous users cannot update logs', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user3.user.id),
				fakeLogEntry(user3.user.id),
				fakeLogEntry(admin.user.id),
				fakeLogEntry(admin.user.id)
			];

			const savePromises = [];
			fakes.forEach(fake => {
				savePromises.push(new LogEntry(fake).save());
			});

			Promise.all(savePromises)
				.then(entities => {
					const expected = _.map(entities, e => ({
						entryId: e.id,
						...fakeLogEntry()
					}));

					return Promise.all([
						request(App)
							.put(`/users/${ user1.user.username }/logs`)
							.send([ expected[0], expected[1] ]),
						request(App)
							.put(`/users/${ user2.user.username }/logs`)
							.send([ expected[2], expected[3] ]),
						request(App)
							.put(`/users/${ user3.user.username }/logs`)
							.send([ expected[4], expected[5] ]),
						request(App)
							.put(`/users/${ admin.user.username }/logs`)
							.send([ expected[6], expected[7] ])
					]);
				})
				.then(res => {
					res.forEach(r => {
						expect(r.status).to.equal(403);
						expect(r.body.status).to.equal(403);
						expect(r.body.errorId).to.equal(ErrorIds.forbidden);
					});
					done();
				})
				.catch(done);
		});

		it('Admins can update logs in any user\'s log book', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user3.user.id),
				fakeLogEntry(user3.user.id)
			];
			let expected = null;

			Promise.all(_.map(fakes, f => new LogEntry(f).save()))
				.then(entities => {
					expected = _.map(entities, e => {
						const newData = {
							entryId: e.id,
							...fakeLogEntry()
						};

						delete newData.userId;
						return newData;
					});

					return Promise.all([
						admin.agent
							.put(`/users/${ user1.user.username }/logs`)
							.send([ expected[0], expected[1] ]),
						admin.agent
							.put(`/users/${ user2.user.username }/logs`)
							.send([ expected[2], expected[3] ]),
						admin.agent
							.put(`/users/${ user3.user.username }/logs`)
							.send([ expected[4], expected[5] ])
					]);
				})
				.then(res => {
					for (let i = 0; i < res.length; i++) {
						expect(res[i].status).to.equal(200);
						expect(res[i].body).to.eql([ expected[i * 2], expected[(i * 2) + 1] ]);
					}
					done();
				})
				.catch(done);
		});

		it('Users cannot update logs in other user\'s log books', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(admin.user.id),
				fakeLogEntry(admin.user.id)
			];

			Promise.all(_.map(fakes, f => new LogEntry(f).save()))
				.then(entities => {
					const expected = _.map(entities, e => ({
						entryId: e.id,
						...fakeLogEntry()
					}));

					return Promise.all([
						user3.agent
							.put(`/users/${ user1.user.username }/logs`)
							.send([ expected[0], expected[1] ]),
						user3.agent
							.put(`/users/${ user2.user.username }/logs`)
							.send([ expected[2], expected[3] ]),
						user3.agent
							.put(`/users/${ admin.user.username }/logs`)
							.send([ expected[4], expected[5] ])
					]);
				})
				.then(res => {
					res.forEach(r => {
						expect(r.status).to.equal(403);
						expect(r.body.status).to.equal(403);
						expect(r.body.errorId).to.equal(ErrorIds.forbidden);
					});
					done();
				})
				.catch(done);
		});
	});

	describe('DELETE /users/:username/logs', () => {

		it('Returns Not Found if user does not exist', done => {
			const fakeIds = [
				fakeMongoId(),
				fakeMongoId()
			];

			admin.agent
				.del('/users/not_a_user/logs')
				.send(fakeIds)
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					expect(res.body.errorId).to.equal(ErrorIds.notFound);

					return user1.agent
						.del('/users/not_a_user/logs')
						.send(fakeIds);
				})
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.status).to.equal(404);
					expect(res.body.errorId).to.equal(ErrorIds.notFound);
					done();
				})
				.catch(done);
		});

		it('Anonymous users cannot delete logs', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user3.user.id),
				fakeLogEntry(user3.user.id),
				fakeLogEntry(admin.user.id),
				fakeLogEntry(admin.user.id)
			];

			Promise.all(_.map(fakes, f => new LogEntry(f).save()))
				.then(entries => Promise
					.all([
						request(App)
							.del(`/users/${ user1.user.username }/logs`)
							.send([ entries[0].id, entries[1].id ]),
						request(App)
							.del(`/users/${ user2.user.username }/logs`)
							.send([ entries[2].id, entries[3].id ]),
						request(App)
							.del(`/users/${ user3.user.username }/logs`)
							.send([ entries[4].id, entries[5].id ]),
						request(App)
							.del(`/users/${ admin.user.username }/logs`)
							.send([ entries[6].id, entries[7].id ])
					]))
				.then(res => {
					res.forEach(r => {
						expect(r.status).to.equal(403);
						expect(r.body.status).to.equal(403);
						expect(r.body.errorId).to.equal(ErrorIds.forbidden);
					});
					done();
				})
				.catch(done);
		});

		it('Admins can delete logs from any user\'s log book', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user3.user.id),
				fakeLogEntry(user3.user.id)
			];

			Promise.all(_.map(fakes, f => new LogEntry(f).save()))
				.then(entries => Promise
					.all([
						admin.agent
							.del(`/users/${ user1.user.username }/logs`)
							.send([ entries[0].id, entries[1].id ]),
						admin.agent
							.del(`/users/${ user2.user.username }/logs`)
							.send([ entries[2].id, entries[3].id ]),
						admin.agent
							.del(`/users/${ user3.user.username }/logs`)
							.send([ entries[4].id, entries[5].id ])
					]))
				.then(res => {
					for (let i = 0; i < res.length; i++) {
						expect(res[i].status).to.equal(200);
					}
					done();
				})
				.catch(done);
		});

		it('Users cannot delete logs from other user\'s log books', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(admin.user.id),
				fakeLogEntry(admin.user.id)
			];

			Promise.all(_.map(fakes, f => new LogEntry(f).save()))
				.then(entries => Promise
					.all([
						user3.agent
							.del(`/users/${ user1.user.username }/logs`)
							.send([ entries[0].id, entries[1].id ]),
						user3.agent
							.del(`/users/${ user2.user.username }/logs`)
							.send([ entries[2].id, entries[3].id ]),
						user3.agent
							.del(`/users/${ admin.user.username }/logs`)
							.send([ entries[4].id, entries[5].id ])
					]))
				.then(res => {
					res.forEach(r => {
						expect(r.status).to.equal(403);
						expect(r.body.status).to.equal(403);
						expect(r.body.errorId).to.equal(ErrorIds.forbidden);
					});
					done();
				})
				.catch(done);
		});
	});
});
