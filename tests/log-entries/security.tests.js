import _ from 'lodash';
import { App } from '../../service/server';
import createAccount from '../util/create-fake-account';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import fakeLogEntry from '../util/fake-log-entry';
import fakeMongoId from '../util/fake-mongo-id';
import LogEntry from '../../service/data/log-entry';
import request from 'supertest';
import Session from '../../service/data/session';
import User from '../../service/data/user';

describe('Log Entry Security', () => {
	let admin = null;
	let user1 = null;
	let user2 = null;
	let user3 = null;

	before(async () => {
		const results = await Promise.all([
			createAccount('admin'),
			createAccount('user', 'public'),
			createAccount('user', 'friends-only'),
			createAccount('user', 'private')
		]);

		[ admin, user1, user2, user3 ] = results;
	});

	after(async () => {
		await User.deleteMany({});
		await Session.deleteMany({});
	});

	afterEach(async () => {
		await LogEntry.deleteMany({});
	});

	describe('GET /users/:username/logs/:logId', () => {
		it('Returns Not Found if user does not exist', async () => {
			const fake = fakeLogEntry(user1.user.id);
			const logEntry = new LogEntry(fake);

			const entity = await logEntry.save();
			const res = await request(App)
				.get(`/users/not_a_user/logs/${ entity.id }`)
				.set(...admin.authHeader)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Returns Not Found if log entry does not belong to the specified user', async () => {
			const fake = fakeLogEntry(user1.user.id);
			const logEntry = new LogEntry(fake);

			const entity = await logEntry.save();
			const res = await request(App)
				.get(`/users/${ user2.user.username }/logs/${ entity.id }`)
				.set(...admin.authHeader)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Returns Not Found if log entry does not exist', async () => {
			const res = await request(App)
				.get(`/users/${ user2.user.username }/logs/${ fakeMongoId() }`)
				.set(...admin.authHeader)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Anonymous users can view logs when log books are public', async () => {
			const fake = fakeLogEntry(user1.user.id);
			const logEntry = new LogEntry(fake);

			const entity = await logEntry.save();
			fake.entryId = entity.id;
			delete fake.userId;

			const res = await request(App)
				.get(`/users/${ user1.user.username }/logs/${ entity.id }`)
				.expect(200);
			fake.readOnly = true;
			expect(res.body).to.eql(fake);
		});

		it('Anonymous users cannot view logs when log books are friends-only', async () => {
			const fake = fakeLogEntry(user2.user.id);
			const logEntry = new LogEntry(fake);

			const entity = await logEntry.save();
			const res = await request(App)
				.get(`/users/${ user2.user.username }/logs/${ entity.id }`)
				.expect(403);
			expect(res.body.status).to.equal(403);
			expect(res.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Anonmyous users cannot view logs when log books are private', async () => {
			const fake = fakeLogEntry(user3.user.id);
			const logEntry = new LogEntry(fake);

			const entity = await logEntry.save();
			const res = await request(App)
				.get(`/users/${ user3.user.username }/logs/${ entity.id }`)
				.expect(403);
			expect(res.body.status).to.equal(403);
			expect(res.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Admins can view logs when log books are private', async () => {
			const fake = fakeLogEntry(user3.user.id);
			const logEntry = new LogEntry(fake);

			const entity = await logEntry.save();
			fake.entryId = entity.id;
			delete fake.userId;

			const res = await request(App)
				.get(`/users/${ user3.user.username }/logs/${ entity.id }`)
				.set(...admin.authHeader)
				.expect(200);
			fake.readOnly = false;
			expect(res.body).to.eql(fake);
		});

		it('Admins can view logs when log books are friends-only', async () => {
			const fake = fakeLogEntry(user2.user.id);
			const logEntry = new LogEntry(fake);

			const entity = await logEntry.save();
			fake.entryId = entity.id;
			delete fake.userId;

			const res = await request(App)
				.get(`/users/${ user2.user.username }/logs/${ entity.id }`)
				.set(...admin.authHeader)
				.expect(200);
			fake.readOnly = false;
			expect(res.body).to.eql(fake);
		});

		it('Users can view their own private logs', async () => {
			const fake = fakeLogEntry(user3.user.id);
			const logEntry = new LogEntry(fake);

			const entity = await logEntry.save();
			fake.entryId = entity.id;
			delete fake.userId;

			const res = await request(App)
				.get(`/users/${ user3.user.username }/logs/${ entity.id }`)
				.set(...user3.authHeader)
				.expect(200);
			fake.readOnly = false;
			expect(res.body).to.eql(fake);
		});

		it('Users can view their own friends-only logs', async () => {
			const fake = fakeLogEntry(user2.user.id);
			const logEntry = new LogEntry(fake);

			const entity = await logEntry.save();
			fake.entryId = entity.id;
			delete fake.userId;

			const res = await request(App)
				.get(`/users/${ user2.user.username }/logs/${ entity.id }`)
				.set(...user2.authHeader)
				.expect(200);
			fake.readOnly = false;
			expect(res.body).to.eql(fake);
		});

		it('Admins can view logs when log books are public', async () => {
			const fake = fakeLogEntry(user1.user.id);
			const logEntry = new LogEntry(fake);

			const entity = await logEntry.save();
			fake.entryId = entity.id;
			delete fake.userId;

			const res = await request(App)
				.get(`/users/${ user1.user.username }/logs/${ entity.id }`)
				.set(...admin.authHeader)
				.expect(200);
			fake.readOnly = false;
			expect(res.body).to.eql(fake);
		});

		it('Users can view logs when log books are public', async () => {
			const fake = fakeLogEntry(user1.user.id);
			const logEntry = new LogEntry(fake);

			const entity = await logEntry.save();
			fake.entryId = entity.id;
			delete fake.userId;

			const res = await request(App)
				.get(`/users/${ user1.user.username }/logs/${ entity.id }`)
				.set(...user2.authHeader)
				.expect(200);
			fake.readOnly = true;
			expect(res.body).to.eql(fake);
		});

		it.skip('Users can view logs from friends\' "friends-only" log book', async () => {
			// TODO: Make the 'friending' logic.
		});

		it('Users cannot view logs from "friends-only" log books when they are not friended', async () => {
			const fake = fakeLogEntry(user2.user.id);
			const logEntry = new LogEntry(fake);
			const entity = await logEntry.save();
			const res = await request(App)
				.get(`/users/${ user2.user.username }/logs/${ entity.id }`)
				.set(...user1.authHeader)
				.expect(403);
			expect(res.body.status).to.equal(403);
			expect(res.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Users cannot view logs from private log books', async () => {
			const fake = fakeLogEntry(user3.user.id);
			const logEntry = new LogEntry(fake);
			const entity = await logEntry.save();
			const res = await request(App)
				.get(`/users/${ user3.user.username }/logs/${ entity.id }`)
				.set(...user1.authHeader)
				.expect(403);
			expect(res.body.status).to.equal(403);
			expect(res.body.errorId).to.equal(ErrorIds.forbidden);
		});
	});

	describe('PUT /users/:username/logs/:logId', () => {

		it('Returns Not Found if user does not exist', async () => {
			const res = await request(App)
				.put(`/users/not_a_user/logs/${ fakeMongoId() }`)
				.set(...admin.authHeader)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Returns Not Found if log entry does not belong to the specified user', async () => {
			const fake = fakeLogEntry(user1.user.id);
			const logEntry = new LogEntry(fake);

			const entity = await logEntry.save();
			const res = await request(App)
				.put(`/users/${ user2.user.username }/logs/${ entity.id }`)
				.set(...admin.authHeader)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Returns Not Found if log entry does not exist', async () => {
			const fake = fakeLogEntry(user1.user.id);
			const logEntry = new LogEntry(fake);

			await logEntry.save();
			const res = await request(App)
				.put(`/users/${ user2.user.username }/logs/${ fakeMongoId() }`)
				.set(...admin.authHeader)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Returns Not Found if user does not exist', async () => {
			const fake = fakeLogEntry(user3.user.id);
			const logEntry = new LogEntry(fake);
			const entity = await logEntry.save();
			const res = await request(App)
				.put(`/users/not_a_user/logs/${ entity.id }`)
				.set(...user3.authHeader)
				.send(fake)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Returns Not Found if log entry does not exist', async () => {
			const fake = fakeLogEntry();
			const res = await request(App)
				.put(`/users/${ user3.user.username }/logs/${ fakeMongoId() }`)
				.set(...user3.authHeader)
				.send(fake)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Returns Not Found if log entry does not belong to specified user', async () => {
			const fake = fakeLogEntry(user3.user.id);
			const logEntry = new LogEntry(fake);
			const entity = await logEntry.save();
			const res = await request(App)
				.put(`/users/${ user1.user.username }/logs/${ entity.id }`)
				.set(...user1.authHeader)
				.send(fake)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Anonymous users cannot put logs in any log books', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user3.user.id),
				fakeLogEntry(admin.user.id)
			];

			const entries = await Promise.all(_.map(fakes, f => new LogEntry(f).save()));
			fakes.forEach(f => {
				delete f.userId;
			});

			const res = await Promise.all([
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
			res.forEach(r => {
				expect(r.status).to.equal(403);
				expect(r.body.status).to.equal(403);
				expect(r.body.errorId).to.equal(ErrorIds.forbidden);
			});
		});

		it('Admins can put logs in other user\'s log books', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user3.user.id)
			];

			const entries = await Promise.all(_.map(fakes, f => new LogEntry(f).save()));
			fakes.forEach(f => {
				delete f.userId;
			});

			const res = await Promise.all([
				request(App)
					.put(`/users/${ user1.user.username }/logs/${ entries[0].id }`)
					.set(...admin.authHeader)
					.send(fakes[0]),
				request(App)
					.put(`/users/${ user2.user.username }/logs/${ entries[1].id }`)
					.set(...admin.authHeader)
					.send(fakes[1]),
				request(App)
					.put(`/users/${ user3.user.username }/logs/${ entries[2].id }`)
					.set(...admin.authHeader)
					.send(fakes[2])
			]);
			for (let i = 0; i < fakes.length; i++) {
				expect(res[i].status).to.equal(200);
			}
		});

		it('Users cannot put logs in other user\'s log books', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(admin.user.id)
			];

			const entries = await Promise.all(_.map(fakes, f => new LogEntry(f).save()));
			fakes.forEach(f => {
				delete f.userId;
			});

			const res = await Promise.all([
				request(App)
					.put(`/users/${ user1.user.username }/logs/${ entries[0].id }`)
					.set(...user3.authHeader)
					.send(fakes[0]),
				request(App)
					.put(`/users/${ user2.user.username }/logs/${ entries[1].id }`)
					.set(...user3.authHeader)
					.send(fakes[1]),
				request(App)
					.put(`/users/${ admin.user.username }/logs/${ entries[2].id }`)
					.set(...user3.authHeader)
					.send(fakes[2])
			]);
			res.forEach(r => {
				expect(r.status).to.equal(403);
				expect(r.body.status).to.equal(403);
				expect(r.body.errorId).to.equal(ErrorIds.forbidden);
			});
		});
	});

	describe('DELETE /users/:username/logs/:logId', () => {

		it('Returns Not Found if user does not exist', async () => {
			const res = await request(App)
				.del(`/users/not_a_user/logs/${ fakeMongoId() }`)
				.set(...admin.authHeader)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Returns Not Found if log entry does not belong to the specified user', async () => {
			const fake = fakeLogEntry(user1.user.id);
			const logEntry = new LogEntry(fake);

			const entity = await logEntry.save();
			const res = await request(App)
				.del(`/users/${ user2.user.username }/logs/${ entity.id }`)
				.set(...admin.authHeader)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Returns Not Found if log entry does not exist', async () => {
			const res = await request(App)
				.del(`/users/${ user2.user.username }/logs/${ fakeMongoId() }`)
				.set(...admin.authHeader)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Returns Not Found if user does not exist', async () => {
			const fake = fakeLogEntry(user3.user.id);
			const logEntry = new LogEntry(fake);

			const entity = await logEntry.save();
			const res = await request(App)
				.del(`/users/not_a_user/logs/${ entity.id }`)
				.set(...user3.authHeader)
				.send(fake)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Returns Not Found if log entry does not exist', async () => {
			const fake = fakeLogEntry();
			const res = await request(App)
				.del(`/users/${ user3.user.username }/logs/${ fakeMongoId() }`)
				.set(...user3.authHeader)
				.send(fake)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Returns Not Found if log entry does not belong to specified user', async () => {
			const fake = fakeLogEntry(user3.user.id);
			const logEntry = new LogEntry(fake);

			const entity = await logEntry.save();
			const res = await request(App)
				.del(`/users/${ user1.user.username }/logs/${ entity.id }`)
				.set(...user1.authHeader)
				.send(fake)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Anonymous users cannot delete logs from any log books', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user3.user.id),
				fakeLogEntry(admin.user.id)
			];

			const entries = await Promise.all(_.map(fakes, f => new LogEntry(f).save()));
			fakes.forEach(f => {
				delete f.userId;
			});

			const res = await Promise.all([
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
			res.forEach(r => {
				expect(r.status).to.equal(403);
				expect(r.body.status).to.equal(403);
				expect(r.body.errorId).to.equal(ErrorIds.forbidden);
			});
		});

		it('Admins can delete logs from other user\'s log books', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user3.user.id)
			];

			const entries = await Promise.all(_.map(fakes, f => new LogEntry(f).save()));
			fakes.forEach(f => {
				delete f.userId;
			});

			const res = await Promise.all([
				request(App)
					.del(`/users/${ user1.user.username }/logs/${ entries[0].id }`)
					.set(...admin.authHeader)
					.send(fakes[0]),
				request(App)
					.del(`/users/${ user2.user.username }/logs/${ entries[1].id }`)
					.set(...admin.authHeader)
					.send(fakes[1]),
				request(App)
					.del(`/users/${ user3.user.username }/logs/${ entries[2].id }`)
					.set(...admin.authHeader)
					.send(fakes[2])
			]);
			for (let i = 0; i < fakes.length; i++) {
				expect(res[i].status).to.equal(204);
			}
		});

		it('Users cannot delete logs from other user\'s log books', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(admin.user.id)
			];

			const entries = await Promise.all(_.map(fakes, f => new LogEntry(f).save()));
			fakes.forEach(f => {
				delete f.userId;
			});

			const res = await Promise.all([
				request(App)
					.del(`/users/${ user1.user.username }/logs/${ entries[0].id }`)
					.set(...user3.authHeader)
					.send(fakes[0]),
				request(App)
					.del(`/users/${ user2.user.username }/logs/${ entries[1].id }`)
					.set(...user3.authHeader)
					.send(fakes[1]),
				request(App)
					.del(`/users/${ admin.user.username }/logs/${ entries[2].id }`)
					.set(...user3.authHeader)
					.send(fakes[2])
			]);

			res.forEach(r => {
				expect(r.status).to.equal(403);
				expect(r.body.status).to.equal(403);
				expect(r.body.errorId).to.equal(ErrorIds.forbidden);
			});
		});
	});

	describe('POST /users/:username/logs', () => {

		it('Returns Not Found if user does not exist', async () => {
			const fakes = [
				fakeLogEntry(),
				fakeLogEntry()
			];

			let res = await request(App)
				.post('/users/not_a_user/logs')
				.set(...admin.authHeader)
				.send(fakes)
				.expect(404);
			expect(res.status).to.equal(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);

			res = await request(App)
				.post('/users/not_a_user/logs')
				.set(...user1.authHeader)
				.send(fakes)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Anonymous users cannot upload logs', async () => {
			const fakes = [
				fakeLogEntry(),
				fakeLogEntry()
			];

			const res = await Promise.all(
				[
					request(App).post(`/users/${ user1.user.username }/logs`).send(fakes),
					request(App).post(`/users/${ user2.user.username }/logs`).send(fakes),
					request(App).post(`/users/${ user3.user.username }/logs`).send(fakes),
					request(App).post(`/users/${ admin.user.username }/logs`).send(fakes)
				]
			);
			res.forEach(r => {
				expect(r.status).to.equal(403);
				expect(r.body.status).to.equal(403);
				expect(r.body.errorId).to.equal(ErrorIds.forbidden);
			});
		});

		it('Admins can upload logs to any user\'s log book', async () => {
			const fakes = [
				fakeLogEntry(),
				fakeLogEntry()
			];

			const res = await Promise.all(
				[
					request(App)
						.post(`/users/${ user1.user.username }/logs`)
						.set(...admin.authHeader)
						.send(fakes),
					request(App)
						.post(`/users/${ user2.user.username }/logs`)
						.set(...admin.authHeader)
						.send(fakes),
					request(App)
						.post(`/users/${ user3.user.username }/logs`)
						.set(...admin.authHeader)
						.send(fakes),
					request(App)
						.post(`/users/${ admin.user.username }/logs`)
						.set(...admin.authHeader)
						.send(fakes)
				]
			);

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
		});

		it('Users cannot upload logs to other users\' log books', async () => {
			const fakes = [
				fakeLogEntry(),
				fakeLogEntry()
			];

			const res = await Promise.all(
				[
					request(App)
						.post(`/users/${ user2.user.username }/logs`)
						.set(...user1.authHeader)
						.send(fakes),
					request(App)
						.post(`/users/${ user3.user.username }/logs`)
						.set(...user1.authHeader)
						.send(fakes),
					request(App)
						.post(`/users/${ admin.user.username }/logs`)
						.set(...user1.authHeader)
						.send(fakes)
				]
			);

			res.forEach(r => {
				expect(r.status).to.equal(403);
				expect(r.body.status).to.equal(403);
				expect(r.body.errorId).to.equal(ErrorIds.forbidden);
			});
		});
	});

	describe('PUT /users/:username/logs', () => {

		it('Returns Not Found if user does not exist', async () => {
			const fakes = [
				fakeLogEntry(fakeMongoId()),
				fakeLogEntry(fakeMongoId())
			];

			let res = await request(App)
				.put('/users/not_a_user/logs')
				.set(...admin.authHeader)
				.send(fakes)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);

			res = await request(App)
				.post('/users/not_a_user/logs')
				.set(...user1.authHeader)
				.send(fakes)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Anonymous users cannot update logs', async () => {
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

			const entities = await Promise.all(savePromises);
			const expected = _.map(entities, e => ({
				entryId: e.id,
				...fakeLogEntry()
			}));

			const res = await Promise.all([
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
			res.forEach(r => {
				expect(r.status).to.equal(403);
				expect(r.body.status).to.equal(403);
				expect(r.body.errorId).to.equal(ErrorIds.forbidden);
			});
		});

		it('Admins can update logs in any user\'s log book', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user3.user.id),
				fakeLogEntry(user3.user.id)
			];
			let expected = null;

			const entities = await Promise.all(_.map(fakes, f => new LogEntry(f).save()));
			expected = _.map(entities, e => {
				const newData = {
					entryId: e.id,
					...fakeLogEntry()
				};

				delete newData.userId;
				return newData;
			});

			const res = await Promise.all([
				request(App)
					.put(`/users/${ user1.user.username }/logs`)
					.set(...admin.authHeader)
					.send([ expected[0], expected[1] ]),
				request(App)
					.put(`/users/${ user2.user.username }/logs`)
					.set(...admin.authHeader)
					.send([ expected[2], expected[3] ]),
				request(App)
					.put(`/users/${ user3.user.username }/logs`)
					.set(...admin.authHeader)
					.send([ expected[4], expected[5] ])
			]);

			for (let i = 0; i < res.length; i++) {
				expect(res[i].status).to.equal(200);
				expect(res[i].body).to.eql([ expected[i * 2], expected[(i * 2) + 1] ]);
			}
		});

		it('Users cannot update logs in other user\'s log books', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(admin.user.id),
				fakeLogEntry(admin.user.id)
			];

			const entities = await Promise.all(_.map(fakes, f => new LogEntry(f).save()));
			const expected = _.map(entities, e => ({
				entryId: e.id,
				...fakeLogEntry()
			}));

			const res = await Promise.all([
				request(App)
					.put(`/users/${ user1.user.username }/logs`)
					.set(...user3.authHeader)
					.send([ expected[0], expected[1] ]),
				request(App)
					.put(`/users/${ user2.user.username }/logs`)
					.set(...user3.authHeader)
					.send([ expected[2], expected[3] ]),
				request(App)
					.put(`/users/${ admin.user.username }/logs`)
					.set(...user3.authHeader)
					.send([ expected[4], expected[5] ])
			]);
			res.forEach(r => {
				expect(r.status).to.equal(403);
				expect(r.body.status).to.equal(403);
				expect(r.body.errorId).to.equal(ErrorIds.forbidden);
			});
		});
	});

	describe('DELETE /users/:username/logs', () => {

		it('Returns Not Found if user does not exist', async () => {
			const fakeIds = [
				fakeMongoId(),
				fakeMongoId()
			];

			let res = await request(App)
				.del('/users/not_a_user/logs')
				.set(...admin.authHeader)
				.send(fakeIds)
				.expect(404);

			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);

			res = await request(App)
				.del('/users/not_a_user/logs')
				.set(...user1.authHeader)
				.send(fakeIds)
				.expect(404);
			expect(res.body.status).to.equal(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Anonymous users cannot delete logs', async () => {
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

			const entries = await Promise.all(_.map(fakes, f => new LogEntry(f).save()));
			const res = await Promise.all([
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
			]);

			res.forEach(r => {
				expect(r.status).to.equal(403);
				expect(r.body.status).to.equal(403);
				expect(r.body.errorId).to.equal(ErrorIds.forbidden);
			});
		});

		it('Admins can delete logs from any user\'s log book', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user3.user.id),
				fakeLogEntry(user3.user.id)
			];

			const entries = await Promise.all(_.map(fakes, f => new LogEntry(f).save()));
			await Promise.all([
				request(App)
					.del(`/users/${ user1.user.username }/logs`)
					.set(...admin.authHeader)
					.send([ entries[0].id, entries[1].id ])
					.expect(200),
				request(App)
					.del(`/users/${ user2.user.username }/logs`)
					.set(...admin.authHeader)
					.send([ entries[2].id, entries[3].id ])
					.expect(200),
				request(App)
					.del(`/users/${ user3.user.username }/logs`)
					.set(...admin.authHeader)
					.send([ entries[4].id, entries[5].id ])
					.expect(200)
			]);
		});

		it('Users cannot delete logs from other user\'s log books', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(user2.user.id),
				fakeLogEntry(admin.user.id),
				fakeLogEntry(admin.user.id)
			];

			const entries = await Promise.all(_.map(fakes, f => new LogEntry(f).save()));
			const res = await Promise.all([
				request(App)
					.del(`/users/${ user1.user.username }/logs`)
					.set(...user3.authHeader)
					.send([ entries[0].id, entries[1].id ]),
				request(App)
					.del(`/users/${ user2.user.username }/logs`)
					.set(...user3.authHeader)
					.send([ entries[2].id, entries[3].id ]),
				request(App)
					.del(`/users/${ admin.user.username }/logs`)
					.set(...user3.authHeader)
					.send([ entries[4].id, entries[5].id ])
			]);

			res.forEach(r => {
				expect(r.status).to.equal(403);
				expect(r.body.status).to.equal(403);
				expect(r.body.errorId).to.equal(ErrorIds.forbidden);
			});
		});
	});
});
