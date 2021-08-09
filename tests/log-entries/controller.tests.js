import _ from 'lodash';
import { App } from '../../service/server';
import createAccount from '../util/create-fake-account';
import mongoose from 'mongoose';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import fakeLogEntry, { toLogEntry } from '../util/fake-log-entry';
import fakeMongoId from '../util/fake-mongo-id';
import LogEntry from '../../service/data/log-entry';
import request from 'supertest';
import sinon from 'sinon';
import User from '../../service/data/user';

let stub = null;

describe('Logs Controller', () => {
	let user1 = null;

	before(async () => {
		user1 = await createAccount();
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
			const logEntry = toLogEntry(fake);
			delete fake.userId;

			const entry = await logEntry.save();
			const res = await request(App)
				.get(`/users/${ user1.user.username }/logs/${ entry.id }`)
				.set(...user1.authHeader)
				.expect(200);

			expect(res.body).to.exist;
			fake.entryId = res.body.entryId;
			fake.readOnly = false;
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

		it('Will create a new record', async () => {
			const fake = fakeLogEntry();
			delete fake.userId;

			const res = await request(App)
				.post(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send([ fake ])
				.expect(201);
			expect(res.body).to.exist;
			expect(res.body).to.be.an('Array');
			expect(res.body.length).to.equal(1);

			fake.entryId = res.body[0].entryId;
			expect(res.body[0]).to.eql(fake);
		});

		it('Will create multiple records', async () => {
			const fakes = [
				fakeLogEntry(),
				fakeLogEntry(),
				fakeLogEntry()
			];

			delete fakes[0].userId;
			delete fakes[1].userId;
			delete fakes[2].userId;

			const res = await request(App)
				.post(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send(fakes)
				.expect(201);
			expect(res.body).to.exist;
			expect(res.body).to.be.an('Array');

			for (let i = 0; i < fakes.length; i++) {
				fakes[i].entryId = res.body[i].entryId;
				expect(res.body[i]).to.eql(fakes[i]);
			}
		});

		it('Will return Bad Request if one or more log entries are invalid', async () => {
			const fakes = [
				fakeLogEntry(),
				fakeLogEntry(),
				fakeLogEntry()
			];

			fakes[1].averageDepth = -1;
			const res = await request(App)
				.post(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send(fakes)
				.expect(400);
			expect(res.body.errorId).to.equal(ErrorIds.badRequest);
			expect(res.body.details).to.be.an('Object');
		});

		it('Will return Bad Request if array is empty', async () => {
			const res = await request(App)
				.post(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send([])
				.expect(400);
			expect(res.body.errorId).to.equal(ErrorIds.badRequest);
			expect(res.body.details).to.be.an('Object');
		});

		it('Will return Bad Request if request payload is empty', async () => {
			const res = await request(App)
				.post(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.expect(400);
			expect(res.body.errorId).to.equal(ErrorIds.badRequest);
			expect(res.body.details).to.be.an('Object');
		});

		it('Will return Server Error if database request fails', async () => {
			const fake = fakeLogEntry();

			stub = sinon.stub(LogEntry, 'insertMany');
			stub.rejects('nope');

			const res = await request(App)
				.post(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send([ fake ])
				.expect(500);
			expect(res.body.status).to.equal(500);
			expect(res.body.logId).to.exist;
		});

	});

	describe('PUT /users/:username/logs/:logId', () => {

		it('Will update the log entry', async () => {
			const fake = fakeLogEntry(user1.user.id);
			const originalEntry = toLogEntry(fake);
			let entryId = null;

			const entry = await originalEntry.save();
			entryId = entry.id;
			fake.location = 'Some new location';
			fake.maxDepth = 139.5;
			delete fake.userId;

			await request(App)
				.put(`/users/${ user1.user.username }/logs/${ entryId }`)
				.set(...user1.authHeader)
				.send(fake)
				.expect(200);

			const res = await request(App)
				.get(`/users/${ user1.user.username }/logs/${ entryId }`)
				.set(...user1.authHeader)
				.expect(200);
			fake.entryId = entryId;
			fake.readOnly = false;
			expect(res.body).to.eql(fake);
		});

		it('Will return Not Found if the log engry does not exit', async () => {
			const fake = fakeLogEntry();
			fake.entryId = fakeMongoId();

			await request(App)
				.put(`/users/${ user1.user.username }/logs/${ fake.entryId }`)
				.set(...user1.authHeader)
				.send(fake)
				.expect(404);
		});

		it('Will return Bad Request if update is invalid', async () => {
			const fake = fakeLogEntry(user1.user.id);
			const originalEntry = toLogEntry(fake);
			let entryId = null;

			const entity = await originalEntry.save();
			entryId = entity.id;
			fake.site = null;
			delete fake.userId;

			const res = await request(App)
				.put(`/users/${ user1.user.username }/logs/${ entryId }`)
				.set(...user1.authHeader)
				.send(fake)
				.expect(400);
			expect(res.body.errorId).to.equal(ErrorIds.badRequest);
			expect(res.body.status).to.equal(400);
		});

		it('Will return Server Error if database fails', async () => {
			const fake = fakeLogEntry(user1.user.id);
			const originalEntry = toLogEntry(fake);
			let entryId = null;

			const entry = await originalEntry.save();
			entryId = entry.id;
			fake.location = 'Some new location';
			fake.maxDepth = 139.5;
			delete fake.userId;

			stub = sinon.stub(mongoose.Model.prototype, 'save');
			stub.rejects('nope');

			const res = await request(App)
				.put(`/users/${ user1.user.username }/logs/${ entryId }`)
				.set(...user1.authHeader)
				.send(fake)
				.expect(500);
			expect(res.body.status).to.equal(500);
			expect(res.body.logId).to.exist;
		});

	});

	describe('DELETE /users/:username/logs/:logId', () => {

		it('Will delete the specified log entry', async () => {
			const fake = fakeLogEntry(user1.user.id);
			const entry = toLogEntry(fake);

			const entity = await entry.save();
			fake.entryId = entity.id;

			await request(App)
				.del(`/users/${ user1.user.username }/logs/${ fake.entryId }`)
				.set(...user1.authHeader)
				.expect(204);

			const res = await LogEntry.findById(fake.entryId);
			expect(res).to.be.null;
		});

		it('Will return Not Found if the log entry does not exist', async () => {
			const entryId = fakeMongoId();

			await request(App)
				.del(`/user/${ user1.user.username }/logs/${ entryId }`)
				.set(...user1.authHeader)
				.expect(404);
		});

		it('Will return Server Error if the database fails', async () => {
			const fake = fakeLogEntry(user1.user.id);
			const entry = toLogEntry(fake);

			const entity = await entry.save();
			fake.entryId = entity.id;

			stub = sinon.stub(LogEntry, 'deleteOne');
			stub.rejects('nope');

			const res = await request(App)
				.del(`/users/${ user1.user.username }/logs/${ fake.entryId }`)
				.set(...user1.authHeader)
				.expect(500);
			expect(res.body.status).to.equal(500);
			expect(res.body.logId).to.exist;
		});
	});

	describe('PUT /users/:username/logs', () => {
		it('Will update records', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id)
			];
			const logEntries = [
				toLogEntry(fakes[0]),
				toLogEntry(fakes[1]),
				toLogEntry(fakes[2])
			];

			let res = await Promise.all([
				logEntries[0].save(),
				logEntries[1].save(),
				logEntries[2].save()
			]);

			fakes[0].entryId = res[0].id;
			fakes[1].entryId = res[1].id;
			fakes[2].entryId = res[2].id;

			delete fakes[0].userId;
			delete fakes[1].userId;
			delete fakes[2].userId;

			fakes[0].weight = { backplate: 12.5 };
			fakes[1].maxDepth = 300;
			fakes[2].site = 'Local swimming pool';

			res = await request(App)
				.put(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send(fakes)
				.expect(200);
			expect(res.body).to.be.an('Array');
			expect(res.body).to.eql(fakes);

			res = await LogEntry.find({ _id: { $in: _.map(res.body, e => e.entryId) } });
			expect(_.map(res, r => r.toCleanJSON())).to.eql(fakes);
		});

		it('Will succeed if one of the records is missing', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id)
			];
			const logEntries = [
				toLogEntry(fakes[0]),
				toLogEntry(fakes[1])
			];

			let res = await Promise.all([ logEntries[0].save(), logEntries[1].save() ]);
			fakes[0].entryId = res[0].id;
			fakes[1].entryId = res[1].id;
			fakes[2].entryId = fakeMongoId();

			delete fakes[0].userId;
			delete fakes[1].userId;
			delete fakes[2].userId;

			fakes[0].weight = { integrated: 6.2 };
			fakes[1].maxDepth = 300;
			fakes[2].site = 'Local swimming pool';

			res = await request(App)
				.put(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send(fakes)
				.expect(200);
			expect(res.body).to.be.an('Array');
			expect(res.body).to.eql(_.take(fakes, 2));

			res = await LogEntry.find({ _id: { $in: _.map(res.body, e => e.entryId) } });
			expect(_.map(res, r => r.toCleanJSON())).to.eql(_.take(fakes, 2));
		});

		it('Will return an empty array if none of the records can be found', async () => {
			const fakes = [
				{ entryId: fakeMongoId(), ...fakeLogEntry() },
				{ entryId: fakeMongoId(), ...fakeLogEntry() },
				{ entryId: fakeMongoId(), ...fakeLogEntry() }
			];

			let res = await request(App)
				.put(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send(fakes)
				.expect(200);
			expect(res.body).to.be.an('Array');
			expect(res.body).to.be.empty;

			res = await LogEntry.find({ _id: { $in: _.map(res.body, e => e.entryId) } });
			expect(res).to.be.empty;
		});

		it('Will return Bad Request if the array is empty', async () => {
			await request(App)
				.put(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send([])
				.expect(400);
		});

		it('Will return Bad Request if the message body is empty', async () => {
			await request(App)
				.put(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.expect(400);
		});

		it('Will return Bad Request if one of the records is invalid', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id)
			];
			const logEntries = [
				toLogEntry(fakes[0]),
				toLogEntry(fakes[1])
			];

			let res = await Promise.all([ logEntries[0].save(), logEntries[1].save() ]);
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

			await request(App)
				.put(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send(modified)
				.expect(400);

			res = await LogEntry.find({ _id: { $in: _.map(fakes, e => e.entryId) } });
			delete fakes[0].userId;
			delete fakes[1].userId;
			expect(_.map(res, r => r.toCleanJSON())).to.eql(fakes);
		});

		it('Will return Bad Request if there are too many records', async () => {
			const fakes = [];
			const logEntries = [];

			for (let i = 0; i < 101; i++) {
				fakes[i] = fakeLogEntry(user1.user.id);
				logEntries[i] = toLogEntry(fakes[i]);
			}

			const res = await Promise.all(_.map(logEntries, e => e.save()));
			for (let i = 0; i < res.length; i++) {
				fakes[i].entryId = res[i].id;
				delete fakes[i].userId;
			}

			await request(App)
				.put(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send(fakes)
				.expect(400);
		});

		it('Will return Server Error if the database fails', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id)
			];
			const logEntries = [
				toLogEntry(fakes[0]),
				toLogEntry(fakes[1]),
				toLogEntry(fakes[2])
			];

			let res = await Promise.all(
				[
					logEntries[0].save(),
					logEntries[1].save(),
					logEntries[2].save()
				]
			);

			fakes[0].entryId = res[0].id;
			fakes[1].entryId = res[1].id;
			fakes[2].entryId = res[2].id;

			delete fakes[0].userId;
			delete fakes[1].userId;
			delete fakes[2].userId;

			fakes[0].weight = { belt: 2.8 };
			fakes[1].maxDepth = 300;
			fakes[2].site = 'Local swimming pool';

			stub = sinon.stub(mongoose.Model.prototype, 'save');
			stub.rejects('nope');

			res = await request(App)
				.put(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send(fakes)
				.expect(500);
			expect(res.body.status).to.equal(500);
			expect(res.body.logId).to.exist;
		});
	});

	describe('DELETE /users/:username/logs', () => {
		it('Will delete the specified log entries', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id)
			];
			const logEntries = [
				toLogEntry(fakes[0]),
				toLogEntry(fakes[1]),
				toLogEntry(fakes[2])
			];

			await Promise.all([ logEntries[0].save(), logEntries[1].save(), logEntries[2].save() ]);
			await request(App)
				.del(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send([ logEntries[0].id, logEntries[1].id, logEntries[2].id ])
				.expect(200);

			const res = await Promise.all([
				LogEntry.findById(logEntries[0].id),
				LogEntry.findById(logEntries[1].id),
				LogEntry.findById(logEntries[2].id)
			]);
			expect(res[0]).to.be.null;
			expect(res[1]).to.be.null;
			expect(res[2]).to.be.null;
		});

		it('Will delete even if an entry is not found', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id)
			];
			const logEntries = [
				toLogEntry(fakes[0]),
				toLogEntry(fakes[1]),
				toLogEntry(fakes[2])
			];

			await Promise.all(
				[
					logEntries[0].save(),
					logEntries[1].save(),
					logEntries[2].save()
				]
			);

			await request(App)
				.del(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send([ logEntries[0].id, logEntries[1].id, logEntries[2].id, fakeMongoId() ])
				.expect(200);

			const res = await Promise.all([
				LogEntry.findById(logEntries[0].id),
				LogEntry.findById(logEntries[1].id),
				LogEntry.findById(logEntries[2].id)
			]);
			expect(res[0]).to.be.null;
			expect(res[1]).to.be.null;
			expect(res[2]).to.be.null;
		});

		it('Will succeed even if no entries are found', async () => {
			const entryIds = [
				fakeMongoId(),
				fakeMongoId(),
				fakeMongoId()
			];

			await request(App)
				.del(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send(entryIds)
				.expect(200);
		});

		it('Will return Bad Request if array is empty', async () => {
			const res = await request(App)
				.del(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send([])
				.expect(400);
			expect(res.body.errorId).to.equal('bottom-time/errors/bad-request');
			expect(res.body.status).to.equal(400);
		});

		it('Will return Bad Request if request payload is empty', async () => {
			const res = await request(App)
				.del(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.expect(400);
			expect(res.body.errorId).to.equal('bottom-time/errors/bad-request');
			expect(res.body.status).to.equal(400);
		});

		it('Will return Bad Request if entry ID list is invalid', async () => {
			const res = await request(App)
				.del(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send({ omg: 'wat?' })
				.expect(400);
			expect(res.body.errorId).to.equal('bottom-time/errors/bad-request');
			expect(res.body.status).to.equal(400);
		});

		it('Will return Server Error if the database fails', async () => {
			const fakes = [
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id),
				fakeLogEntry(user1.user.id)
			];
			const logEntries = [
				toLogEntry(fakes[0]),
				toLogEntry(fakes[1]),
				toLogEntry(fakes[2])
			];

			await Promise.all([ logEntries[0].save(), logEntries[1].save(), logEntries[2].save() ]);

			stub = sinon.stub(LogEntry, 'deleteMany');
			stub.rejects('nope');

			const res = await request(App)
				.del(`/users/${ user1.user.username }/logs`)
				.set(...user1.authHeader)
				.send([ logEntries[0].id, logEntries[1].id, logEntries[2].id ])
				.expect(500);
			expect(res.body.status).to.equal(500);
			expect(res.body.logId).to.exist;
		});
	});
});
