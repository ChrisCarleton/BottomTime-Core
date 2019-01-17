import _ from 'lodash';
import { App } from '../../service/server';
import Bluebird from 'bluebird';
import createAccount from '../util/create-fake-account';
import mongoose from 'mongoose';
import { expect } from 'chai';
import fakeLogEntry from '../util/fake-log-entry';
import fakeMongoId from '../util/fake-mongo-id';
import LogEntry from '../../service/data/log-entry';
import request from 'supertest';
import sinon from 'sinon';
import User from '../../service/data/user';

let stub = null;

describe('Logs Controller', () => {
	let admin = null;
	let user1 = null;

	before(async () => {
		[ admin, user1 ] = await Bluebird.all([ createAccount('admin'), createAccount() ]);
	});

	after(async () => {
		await User.deleteMany({});
	});

	afterEach(async () => {
		if (stub) {
			stub.restore();
			stub = null;
		}

		await LogEntry.deleteMany({});
	});

	describe('GET /users/:username/logs/:logId', () => {

		it('Will fetch the requested log entry', async () => {
			const fake = fakeLogEntry(user1.user.id);
			const logEntry = new LogEntry(fake);
			delete fake.userId;

			const entry = await logEntry.save();
			const res = await request(App)
				.get(`/users/${ user1.user.username }/logs/${ entry.id }`)
				.set(...user1.authHeader)
				.expect(200);

			expect(res.body).to.exist;
			fake.entryId = res.body.entryId;
			expect(res.body).to.eql(fake);
		});

		it('Will return Not Found if entry does not exist', async () => {
			const fakeId = fakeMongoId();
			await request(App)
				.get(`/users/${ user1.user.username }/logs/${ fakeId }`)
				.set(...user1.authHeader)
				.expect(404);
		});

		it('Will return Server Error if something goes wrong', async () => {
			stub = sinon.stub(LogEntry, 'findById');
			stub.rejects('nope');

			const fakeId = fakeMongoId();
			const res = await request(App)
				.get(`/users/${ user1.user.username }/logs/${ fakeId }`)
				.set(...user1.authHeader)
				.expect(500);
			expect(res.body.logId).to.exist;
			expect(res.body.status).to.equal(500);
		});

	});

	describe('POST /users/:username/logs', () => {

		it('Will create a new record', done => {
			const fake = fakeLogEntry();
			delete fake.userId;

			user1.agent
				.post(`/users/${ user1.user.username }/logs`)
				.send([ fake ])
				.then(res => {
					expect(res.status).to.equal(201);
					expect(res.body).to.exist;
					expect(res.body).to.be.an('Array');
					expect(res.body.length).to.equal(1);

					fake.entryId = res.body[0].entryId;
					expect(res.body[0]).to.eql(fake);
					done();
				})
				.catch(done);
		});

		it('Will create multiple records', done => {
			const fakes = [
				fakeLogEntry(),
				fakeLogEntry(),
				fakeLogEntry()
			];

			delete fakes[0].userId;
			delete fakes[1].userId;
			delete fakes[2].userId;

			user1.agent
				.post(`/users/${ user1.user.username }/logs`)
				.send(fakes)
				.then(res => {
					expect(res.status).to.equal(201);
					expect(res.body).to.exist;
					expect(res.body).to.be.an('Array');

					for (let i = 0; i < fakes.length; i++) {
						fakes[i].entryId = res.body[i].entryId;
						expect(res.body[i]).to.eql(fakes[i]);
					}
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if one or more log entries are invalid', done => {
			const fakes = [
				fakeLogEntry(),
				fakeLogEntry(),
				fakeLogEntry()
			];

			fakes[1].averageDepth = -1;
			user1.agent
				.post(`/users/${ user1.user.username }/logs`)
				.send(fakes)
				.then(res => {
					expect(res.status).to.equal(400);
					expect(res.body.errorId).to.equal('bottom-time/errors/bad-request');
					expect(res.body.details.isJoi).to.be.true;
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if array is empty', done => {
			user1.agent
				.post(`/users/${ user1.user.username }/logs`)
				.send([])
				.then(res => {
					expect(res.status).to.equal(400);
					expect(res.body.errorId).to.equal('bottom-time/errors/bad-request');
					expect(res.body.details.isJoi).to.be.true;
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if request payload is empty', done => {
			user1.agent
				.post(`/users/${ user1.user.username }/logs`)
				.then(res => {
					expect(res.status).to.equal(400);
					expect(res.body.errorId).to.equal('bottom-time/errors/bad-request');
					expect(res.body.details.isJoi).to.be.true;
					done();
				})
				.catch(done);
		});

		it('Will return Server Error if database request fails', done => {
			const fake = fakeLogEntry();

			stub = sinon.stub(mongoose.Model.prototype, 'save');
			stub.rejects('nope');

			user1.agent
				.post(`/users/${ user1.user.username }/logs`)
				.send([ fake ])
				.then(res => {
					expect(res.status).to.equal(500);
					expect(res.body.status).to.equal(500);
					expect(res.body.logId).to.exist;
					done();
				})
				.catch(done);
		});

	});

	describe('PUT /users/:username/logs/:logId', () => {

		it('Will update the log entry', done => {
			const fake = fakeLogEntry(user1.user.id);
			const originalEntry = new LogEntry(fake);
			let entryId = null;

			originalEntry.save()
				.then(entry => {
					entryId = entry.id;
					fake.location = 'Some new location';
					fake.maxDepth = 139.5;
					delete fake.userId;

					return user1.agent
						.put(`/users/${ user1.user.username }/logs/${ entryId }`)
						.send(fake);
				})
				.then(res => {
					expect(res.status).to.equal(200);
					return user1.agent
						.get(`/users/${ user1.user.username }/logs/${ entryId }`);
				})
				.then(res => {
					fake.entryId = entryId;
					expect(res.status).to.equal(200);
					expect(res.body).to.eql(fake);
					done();
				})
				.catch(done);
		});

		it('Will return Not Found if the log engry does not exit', done => {
			const fake = fakeLogEntry();
			fake.entryId = fakeMongoId();

			user1.agent
				.put(`/users/${ user1.user.username }/logs/${ fake.entryId }`)
				.send(fake)
				.then(res => {
					expect(res.status).to.equal(404);

					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if update is invalid', done => {
			const fake = fakeLogEntry(user1.user.id);
			const originalEntry = new LogEntry(fake);
			let entryId = null;

			originalEntry.save()
				.then(entity => {
					entryId = entity.id;
					fake.site = null;
					delete fake.userId;

					return user1.agent
						.put(`/users/${ user1.user.username }/logs/${ entryId }`)
						.send(fake);
				})
				.then(res => {
					expect(res.status).to.equal(400);
					expect(res.body.errorId).to.equal('bottom-time/errors/bad-request');
					expect(res.body.status).to.equal(400);

					done();
				})
				.catch(done);
		});

		it('Will return Server Error if database fails', done => {
			const fake = fakeLogEntry(user1.user.id);
			const originalEntry = new LogEntry(fake);
			let entryId = null;

			originalEntry.save()
				.then(entry => {
					entryId = entry.id;
					fake.location = 'Some new location';
					fake.maxDepth = 139.5;
					delete fake.userId;

					stub = sinon.stub(mongoose.Model.prototype, 'save');
					stub.rejects('nope');

					return user1.agent
						.put(`/users/${ user1.user.username }/logs/${ entryId }`)
						.send(fake);
				})
				.then(res => {
					expect(res.status).to.equal(500);
					expect(res.body.status).to.equal(500);
					expect(res.body.logId).to.exist;
					done();
				})
				.catch(done);
		});

	});

	describe('DELETE /users/:username/logs/:logId', () => {

		it('Will delete the specified log entry', done => {
			const fake = fakeLogEntry(user1.user.id);
			const entry = new LogEntry(fake);

			entry.save()
				.then(entity => {
					fake.entryId = entity.id;

					return user1.agent
						.del(`/users/${ user1.user.username }/logs/${ fake.entryId }`);
				})
				.then(res => {
					expect(res.status).to.equal(204);
					return LogEntry.findById(fake.entryId);
				})
				.then(res => {
					expect(res).to.be.null;
					done();
				})
				.catch(done);
		});

		it('Will return Not Found if the log entry does not exist', done => {
			const entryId = fakeMongoId();

			user1.agent
				.del(`/user/${ user1.user.username }/logs/${ entryId }`)
				.then(res => {
					expect(res.status).to.equal(404);
					done();
				})
				.catch(done);
		});

		it('Will return Server Error if the database fails', done => {
			const fake = fakeLogEntry(user1.user.id);
			const entry = new LogEntry(fake);

			entry.save()
				.then(entity => {
					fake.entryId = entity.id;

					stub = sinon.stub(LogEntry, 'deleteOne');
					stub.rejects('nope');

					return user1.agent
						.del(`/users/${ user1.user.username }/logs/${ fake.entryId }`);
				})
				.then(res => {
					expect(res.status).to.equal(500);
					expect(res.body.status).to.equal(500);
					expect(res.body.logId).to.exist;
					done();
				})
				.catch(done);
		});
	});

	describe('PUT /users/:username/logs', () => {
		it('Will update records', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id)
			];
			const logEntries = [
				new LogEntry(fakes[0]),
				new LogEntry(fakes[1]),
				new LogEntry(fakes[2])
			];

			Bluebird.all([ logEntries[0].save(), logEntries[1].save(), logEntries[2].save() ])
				.then(res => {
					fakes[0].entryId = res[0].id;
					fakes[1].entryId = res[1].id;
					fakes[2].entryId = res[2].id;

					delete fakes[0].userId;
					delete fakes[1].userId;
					delete fakes[2].userId;

					fakes[0].weight = { amount: 69.4 };
					fakes[1].maxDepth = 300;
					fakes[2].site = 'Local swimming pool';

					return user1.agent
						.put(`/users/${ user1.user.username }/logs`)
						.send(fakes);
				})
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body).to.be.an('Array');
					expect(res.body).to.eql(fakes);

					return LogEntry.find({ _id: { $in: _.map(res.body, e => e.entryId) } });
				})
				.then(res => {
					expect(_.map(res, r => r.toCleanJSON())).to.eql(fakes);
					done();
				})
				.catch(done);
		});

		it('Will succeed if one of the records is missing', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id)
			];
			const logEntries = [
				new LogEntry(fakes[0]),
				new LogEntry(fakes[1])
			];

			Bluebird.all([ logEntries[0].save(), logEntries[1].save() ])
				.then(res => {
					fakes[0].entryId = res[0].id;
					fakes[1].entryId = res[1].id;
					fakes[2].entryId = fakeMongoId();

					delete fakes[0].userId;
					delete fakes[1].userId;
					delete fakes[2].userId;

					fakes[0].weight = { amount: 69.4 };
					fakes[1].maxDepth = 300;
					fakes[2].site = 'Local swimming pool';

					return user1.agent
						.put(`/users/${ user1.user.username }/logs`)
						.send(fakes);
				})
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body).to.be.an('Array');
					expect(res.body).to.eql(_.take(fakes, 2));

					return LogEntry.find({ _id: { $in: _.map(res.body, e => e.entryId) } });
				})
				.then(res => {
					expect(_.map(res, r => r.toCleanJSON()))
						.to.eql(_.take(fakes, 2));
					done();
				})
				.catch(done);
		});

		it('Will return an empty array if none of the records can be found', done => {
			const fakes = [
				{ entryId: fakeMongoId(), ...fakeLogEntry() },
				{ entryId: fakeMongoId(), ...fakeLogEntry() },
				{ entryId: fakeMongoId(), ...fakeLogEntry() }
			];

			user1.agent
				.put(`/users/${ user1.user.username }/logs`)
				.send(fakes)
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body).to.be.an('Array');
					expect(res.body).to.be.empty;

					return LogEntry.find({ _id: { $in: _.map(res.body, e => e.entryId) } });
				})
				.then(res => {
					expect(res).to.be.empty;
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if the array is empty', done => {
			user1.agent
				.put(`/users/${ user1.user.username }/logs`)
				.send([])
				.then(res => {
					expect(res.status).to.equal(400);
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if the message body is empty', done => {
			user1.agent
				.put(`/users/${ user1.user.username }/logs`)
				.then(res => {
					expect(res.status).to.equal(400);
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if one of the records is invalid', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id)
			];
			const logEntries = [
				new LogEntry(fakes[0]),
				new LogEntry(fakes[1])
			];

			Bluebird.all([ logEntries[0].save(), logEntries[1].save() ])
				.then(res => {
					fakes[0].entryId = res[0].id;
					fakes[1].entryId = res[1].id;

					delete fakes[0].userId;
					delete fakes[1].userId;

					const modified = [
						{ ...fakes[0] },
						{ ...fakes[1] }
					];

					modified[0].weight = { amount: 69.4 };
					modified[1].maxDepth = -23;

					return user1.agent
						.put(`/users/${ user1.user.username }/logs`)
						.send(modified);
				})
				.then(res => {
					expect(res.status).to.equal(400);
					return LogEntry.find({ _id: { $in: _.map(fakes, e => e.entryId) } });
				})
				.then(res => {
					delete fakes[0].userId;
					delete fakes[1].userId;
					expect(_.map(res, r => r.toCleanJSON())).to.eql(fakes);
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if there are too many records', done => {
			const fakes = [];
			const logEntries = [];

			for (let i = 0; i < 101; i++) {
				fakes[i] = fakeLogEntry(user1.user.id);
				logEntries[i] = new LogEntry(fakes[i]);
			}

			Bluebird.all(_.map(logEntries, e => e.save()))
				.then(res => {
					for (let i = 0; i < res.length; i++) {
						fakes[i].entryId = res[i].id;
						delete fakes[i].userId;
					}

					return user1.agent
						.put(`/users/${ user1.user.username }/logs`)
						.send(fakes);
				})
				.then(res => {
					expect(res.status).to.equal(400);
					done();
				})
				.catch(done);
		});

		it('Will return Server Error if the database fails', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id)
			];
			const logEntries = [
				new LogEntry(fakes[0]),
				new LogEntry(fakes[1]),
				new LogEntry(fakes[2])
			];

			Bluebird.all([ logEntries[0].save(), logEntries[1].save(), logEntries[2].save() ])
				.then(res => {
					fakes[0].entryId = res[0].id;
					fakes[1].entryId = res[1].id;
					fakes[2].entryId = res[2].id;

					delete fakes[0].userId;
					delete fakes[1].userId;
					delete fakes[2].userId;

					fakes[0].weight = { amount: 69.4 };
					fakes[1].maxDepth = 300;
					fakes[2].site = 'Local swimming pool';

					stub = sinon.stub(mongoose.Model.prototype, 'save');
					stub.rejects('nope');

					return user1.agent
						.put(`/users/${ user1.user.username }/logs`)
						.send(fakes);
				})
				.then(res => {
					expect(res.status).to.equal(500);
					expect(res.body.status).to.equal(500);
					expect(res.body.logId).to.exist;
					done();
				})
				.catch(done);
		});
	});

	describe('DELETE /users/:username/logs', () => {
		it('Will delete the specified log entries', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id)
			];
			const logEntries = [
				new LogEntry(fakes[0]),
				new LogEntry(fakes[1]),
				new LogEntry(fakes[2])
			];

			Bluebird.all([ logEntries[0].save(), logEntries[1].save(), logEntries[2].save() ])
				.then(() => user1.agent
					.del(`/users/${ user1.user.username }/logs`)
					.send([ logEntries[0].id, logEntries[1].id, logEntries[2].id ]))
				.then(res => {
					expect(res.status).to.equal(200);

					return Bluebird.all([
						LogEntry.findById(logEntries[0].id),
						LogEntry.findById(logEntries[1].id),
						LogEntry.findById(logEntries[2].id)
					]);
				})
				.then(res => {
					expect(res[0]).to.be.null;
					expect(res[1]).to.be.null;
					expect(res[2]).to.be.null;
					done();
				})
				.catch(done);
		});

		it('Will delete even if an entry is not found', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id)
			];
			const logEntries = [
				new LogEntry(fakes[0]),
				new LogEntry(fakes[1]),
				new LogEntry(fakes[2])
			];

			Bluebird
				.all([
					logEntries[0].save(),
					logEntries[1].save(),
					logEntries[2].save()
				], fakeMongoId())
				.then(() => user1.agent
					.del(`/users/${ user1.user.username }/logs`)
					.send([ logEntries[0].id, logEntries[1].id, logEntries[2].id ]))
				.then(res => {
					expect(res.status).to.equal(200);

					return Bluebird.all([
						LogEntry.findById(logEntries[0].id),
						LogEntry.findById(logEntries[1].id),
						LogEntry.findById(logEntries[2].id)
					]);
				})
				.then(res => {
					expect(res[0]).to.be.null;
					expect(res[1]).to.be.null;
					expect(res[2]).to.be.null;
					done();
				})
				.catch(done);
		});

		it('Will succeed even if no entries are found', done => {
			const entryIds = [
				fakeMongoId(),
				fakeMongoId(),
				fakeMongoId()
			];

			user1.agent
				.del(`/users/${ user1.user.username }/logs`)
				.send(entryIds)
				.then(res => {
					expect(res.status).to.equal(200);
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if array is empty', done => {
			user1.agent
				.del(`/users/${ user1.user.username }/logs`)
				.send([])
				.then(res => {
					expect(res.status).to.equal(400);
					expect(res.body.errorId).to.equal('bottom-time/errors/bad-request');
					expect(res.body.status).to.equal(400);
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if request payload is empty', done => {
			user1.agent
				.del(`/users/${ user1.user.username }/logs`)
				.then(res => {
					expect(res.status).to.equal(400);
					expect(res.body.errorId).to.equal('bottom-time/errors/bad-request');
					expect(res.body.status).to.equal(400);
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if entry ID list is invalid', done => {
			user1.agent
				.del(`/users/${ user1.user.username }/logs`)
				.send({ omg: 'wat?' })
				.then(res => {
					expect(res.status).to.equal(400);
					expect(res.body.errorId).to.equal('bottom-time/errors/bad-request');
					expect(res.body.status).to.equal(400);
					done();
				})
				.catch(done);
		});

		it('Will return Server Error if the database fails', done => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id)
			];
			const logEntries = [
				new LogEntry(fakes[0]),
				new LogEntry(fakes[1]),
				new LogEntry(fakes[2])
			];

			Bluebird.all([ logEntries[0].save(), logEntries[1].save(), logEntries[2].save() ])
				.then(() => {
					stub = sinon.stub(LogEntry, 'deleteMany');
					stub.rejects('nope');

					return user1.agent
						.del(`/users/${ user1.user.username }/logs`)
						.send([ logEntries[0].id, logEntries[1].id, logEntries[2].id ]);
				})
				.then(res => {
					expect(res.status).to.equal(500);
					expect(res.body.status).to.equal(500);
					expect(res.body.logId).to.exist;
					done();
				})
				.catch(done);
		});
	});
});
