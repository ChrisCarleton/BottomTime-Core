import _ from 'lodash';
import { App } from '../../service/server';
import Bluebird from 'bluebird';
import mongoose from 'mongoose';
import { expect, request } from 'chai';
import fakeLogEntry from '../util/fake-log-entry';
import LogEntry, { cleanUpLogEntry } from '../../service/data/log-entry';
import sinon from 'sinon';

let stub = null;

describe('Logs Controller', () => {
	afterEach(done => {
		// Clean up sinon stubs.
		if (stub) {
			stub.restore();
			stub = null;
		}

		// Purge log records.
		LogEntry.deleteMany({}, done);
	});

	describe('GET /logs/:logId', () => {

		it('Will fetch the requested log entry', done => {
			const fake = fakeLogEntry();
			const logEntry = new LogEntry(fake);
			logEntry.save()
				.then(entry => request(App)
					.get(`/logs/${ entry.id }`))
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body).to.exist;

					fake.entryId = res.body.entryId;
					expect(res.body).to.eql(fake);
					done();
				})
				.catch(done);
		});

		it('Will return Not Found if entry does not exist', done => {
			const fakeId = 'a99e1685d476a4fdce40d599';
			request(App)
				.get(`/logs/${ fakeId }`)
				.then(res => {
					expect(res.status).to.equal(404);
					done();
				})
				.catch(done);
		});

		it('Will return Server Error if something goes wrong', done => {
			stub = sinon.stub(LogEntry, 'findById');
			stub.rejects('nope');

			const fakeId = 'a99e1685d476a4fdce40d599';
			request(App)
				.get(`/logs/${ fakeId }`)
				.then(res => {
					expect(res.status).to.equal(500);
					expect(res.body.logId).to.exist;
					expect(res.body.status).to.equal(500);
					done();
				})
				.catch(done);
		});

	});

	describe('POST /logs', () => {

		it('Will create a new record', done => {
			const fake = fakeLogEntry();
			request(App)
				.post('/logs')
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

			request(App)
				.post('/logs')
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
			request(App)
				.post('/logs')
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
			request(App)
				.post('/logs')
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
			request(App)
				.post('/logs')
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

			request(App)
				.post('/logs')
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

	describe('PUT /logs/:logId', () => {

		it('Will update the log entry', done => {
			const fake = fakeLogEntry();
			const originalEntry = new LogEntry(fake);
			let entryId = null;

			originalEntry.save()
				.then(entry => {
					entryId = entry.id;
					fake.location = 'Some new location';
					fake.maxDepth = 139.5;

					return request(App)
						.put(`/logs/${ entryId }`)
						.send(fake);
				})
				.then(res => {
					expect(res.status).to.equal(200);
					return request(App)
						.get(`/logs/${ entryId }`);
				})
				.then(res => {
					fake.entryId = entryId;
					expect(res.body).to.eql(fake);
					done();
				})
				.catch(done);
		});

		it('Will return Not Found if the log engry does not exit', done => {
			const fake = fakeLogEntry();
			fake.entryId = 'b5ca1b72aa445300db582a03';

			request(App)
				.put(`/logs/${ fake.entryId }`)
				.send(fake)
				.then(res => {
					expect(res.status).to.equal(404);

					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if update is invalid', done => {
			const fake = fakeLogEntry();
			const originalEntry = new LogEntry(fake);
			let entryId = null;

			originalEntry.save()
				.then(entity => {
					entryId = entity.id;
					fake.site = null;

					return request(App)
						.put(`/logs/${ entryId }`)
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
			const fake = fakeLogEntry();
			const originalEntry = new LogEntry(fake);
			let entryId = null;

			originalEntry.save()
				.then(entry => {
					entryId = entry.id;
					fake.location = 'Some new location';
					fake.maxDepth = 139.5;

					stub = sinon.stub(mongoose.Model.prototype, 'save');
					stub.rejects('nope');

					return request(App)
						.put(`/logs/${ entryId }`)
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

	describe('DELETE /logs/:logId', () => {

		it('Will delete the specified log entry', done => {
			const fake = fakeLogEntry();
			const entry = new LogEntry(fake);

			entry.save()
				.then(entity => {
					fake.entryId = entity.id;

					return request(App)
						.del(`/logs/${ fake.entryId }`);
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
			const entryId = '7916e401d28648cc662f8977';

			request(App)
				.del(`/logs/${ entryId }`)
				.then(res => {
					expect(res.status).to.equal(404);
					done();
				})
				.catch(done);
		});

		it('Will return Server Error if the database fails', done => {
			const fake = fakeLogEntry();
			const entry = new LogEntry(fake);

			entry.save()
				.then(entity => {
					fake.entryId = entity.id;

					stub = sinon.stub(LogEntry, 'deleteOne');
					stub.rejects('nope');

					return request(App)
						.del(`/logs/${ fake.entryId }`);
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

	describe('PUT /logs', () => {
		it('Will update records', done => {
			const fakes = [
				fakeLogEntry(),
				fakeLogEntry(),
				fakeLogEntry()
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

					fakes[0].weight = { amount: 69.4 };
					fakes[1].maxDepth = 300;
					fakes[2].site = 'Local swimming pool';

					return request(App)
						.put('/logs')
						.send(fakes);
				})
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body).to.be.an('Array');
					expect(res.body).to.eql(fakes);

					return LogEntry.find({ _id: { $in: _.map(res.body, e => e.entryId) } });
				})
				.then(res => {
					expect(_.map(res, r => cleanUpLogEntry(r))).to.eql(fakes);
					done();
				})
				.catch(done);
		});

		it('Will succeed if one of the records is missing', done => {
			const fakes = [
				fakeLogEntry(),
				fakeLogEntry(),
				fakeLogEntry()
			];
			const logEntries = [
				new LogEntry(fakes[0]),
				new LogEntry(fakes[1])
			];

			Bluebird.all([ logEntries[0].save(), logEntries[1].save() ])
				.then(res => {
					fakes[0].entryId = res[0].id;
					fakes[1].entryId = res[1].id;
					fakes[2].entryId = '51c6d4fc8fbf1b3e1244b3ed';

					fakes[0].weight = { amount: 69.4 };
					fakes[1].maxDepth = 300;
					fakes[2].site = 'Local swimming pool';

					return request(App)
						.put('/logs')
						.send(fakes);
				})
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body).to.be.an('Array');
					expect(res.body).to.eql(_.take(fakes, 2));

					return LogEntry.find({ _id: { $in: _.map(res.body, e => e.entryId) } });
				})
				.then(res => {
					expect(_.map(res, r => cleanUpLogEntry(r)))
						.to.eql(_.take(fakes, 2));
					done();
				})
				.catch(done);
		});

		it('Will return an empty array if none of the records can be found', done => {
			const fakes = [
				{ entryId: '29af670e6738361f4f34be16', ...fakeLogEntry() },
				{ entryId: 'ab2e0cf79f5f34c6014292f1', ...fakeLogEntry() },
				{ entryId: '7b201421444172c41ecdf766', ...fakeLogEntry() }
			];

			request(App)
				.put('/logs')
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
			request(App)
				.put('/logs')
				.send([])
				.then(res => {
					expect(res.status).to.equal(400);
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if the message body is empty', done => {
			request(App)
				.put('/logs')
				.then(res => {
					expect(res.status).to.equal(400);
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if one of the records is invalid', done => {
			const fakes = [
				fakeLogEntry(),
				fakeLogEntry()
			];
			const logEntries = [
				new LogEntry(fakes[0]),
				new LogEntry(fakes[1])
			];

			Bluebird.all([ logEntries[0].save(), logEntries[1].save() ])
				.then(res => {
					fakes[0].entryId = res[0].id;
					fakes[1].entryId = res[1].id;

					const modified = [
						{ ...fakes[0] },
						{ ...fakes[1] }
					];

					modified[0].weight = { amount: 69.4 };
					modified[1].maxDepth = -23;

					return request(App)
						.put('/logs')
						.send(modified);
				})
				.then(res => {
					expect(res.status).to.equal(400);
					return LogEntry.find({ _id: { $in: _.map(fakes, e => e.entryId) } });
				})
				.then(res => {
					expect(_.map(res, r => cleanUpLogEntry(r))).to.eql(fakes);
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if there are too many records', done => {
			const fakes = [];
			const logEntries = [];

			for (let i = 0; i < 101; i++) {
				fakes[i] = fakeLogEntry();
				logEntries[i] = new LogEntry(fakes[i]);
			}

			Bluebird.all(_.map(logEntries, e => e.save()))
				.then(res => {
					for (let i = 0; i < res.length; i++) {
						fakes[i].entryId = res[i].id;
					}

					return request(App)
						.put('/logs')
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
				fakeLogEntry(),
				fakeLogEntry(),
				fakeLogEntry()
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

					fakes[0].weight = { amount: 69.4 };
					fakes[1].maxDepth = 300;
					fakes[2].site = 'Local swimming pool';

					stub = sinon.stub(mongoose.Model.prototype, 'save');
					stub.rejects('nope');

					return request(App)
						.put('/logs')
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

	describe('DELETE /logs', () => {
		it('Will delete the specified log entries', done => {
			const fakes = [
				fakeLogEntry(),
				fakeLogEntry(),
				fakeLogEntry()
			];
			const logEntries = [
				new LogEntry(fakes[0]),
				new LogEntry(fakes[1]),
				new LogEntry(fakes[2])
			];

			Bluebird.all([ logEntries[0].save(), logEntries[1].save(), logEntries[2].save() ])
				.then(() => request(App)
					.del('/logs')
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
				fakeLogEntry(),
				fakeLogEntry(),
				fakeLogEntry()
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
				], 'a2603a50e9ea2b2ce68c8147')
				.then(() => request(App)
					.del('/logs')
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
				'3fcb29793936e7c81d222432',
				'cac63fdf32b968e8bdc2ef76',
				'113caa26363c46a29e95b0ce'
			];

			request(App)
				.del('/logs')
				.send(entryIds)
				.then(res => {
					expect(res.status).to.equal(200);
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if array is empty', done => {
			request(App)
				.del('/logs')
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
			request(App)
				.del('/logs')
				.then(res => {
					expect(res.status).to.equal(400);
					expect(res.body.errorId).to.equal('bottom-time/errors/bad-request');
					expect(res.body.status).to.equal(400);
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if entry ID list is invalid', done => {
			request(App)
				.del('/logs')
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
				fakeLogEntry(),
				fakeLogEntry(),
				fakeLogEntry()
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

					return request(App)
						.del('/logs')
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
