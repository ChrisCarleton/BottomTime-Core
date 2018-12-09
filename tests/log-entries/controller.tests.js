import { App } from '../../service/server';
import Bluebird from 'bluebird';
import { expect, request } from 'chai';
import fakeLogEntry from '../util/fake-log-entry';
import LogEntry from '../../service/data/log-entry';

let stub;

describe('Logs Controller', () => {
	afterEach(done => {
		// Purge log records.
		LogEntry.deleteMany({}, done);

		// Clean up sinon stubs.
		if (stub) {
			stub.restore();
			stub = null;
		}
	});

	describe('GET /logs/:logId', () => {

		it('Will fetch the requested log entry', done => {
			const fake = fakeLogEntry();
			const logEntry = new LogEntry(fake);
			logEntry.save()
				.then(entry => {
					return request(App)
						.get(`/logs/${entry._id}`);
				})
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
				.get(`/logs/${fakeId}`)
				.then(res => {
					expect(res.status).to.equal(404);
					done();
				})
				.catch(done);
		});

		it('Will return Server Error if something goes wrong', done => {
			done();
		});

	});

	describe('POST /logs', () => {

		it('Will create a new record', done => {
			const fake = fakeLogEntry();
			request(App)
				.post('/logs')
				.send([fake])
				.then(res => {
					expect(res.status).to.equal(200);
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
					expect(res.status).to.equal(200);
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
					expect(res.body.error.isJoi).to.be.true;
					done();
				})
				.catch(done);
		});

		it('Will return Server Error if database request fails', done => {
			done();
		});

	});

	describe('PUT /logs/:logId', () => {

		it('Will update the log entry', done => {
			const fake = fakeLogEntry();
			const originalEntry = new LogEntry(fake);
			let entryId;

			originalEntry.save()
				.then(entry => {
					entryId = entry._id.toString();
					fake.location = 'Some new location';
					fake.maxDepth = 139.5;

					return request(App)
						.put(`/logs/${entryId}`)
						.send(fake);
				})
				.then(res => {
					expect(res.status).to.equal(200);
					return request(App)
						.get(`/logs/${entryId}`);
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
				.put(`/logs/${fake.entryId}`)
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
			let entryId;

			originalEntry.save()
				.then(entity => {
					entryId = entity._id.toString();
					fake.site = null;

					return request(App)
						.put(`/logs/${entryId}`)
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
			done();
		});

	});

	describe('DELETE /logs/:logId', () => {

		it('Will delete the specified log entry', done => {
			const fake = fakeLogEntry();
			const entry = new LogEntry(fake);

			entry.save()
				.then(entity => {
					fake.entryId = entity._id.toString();

					return request(App)
						.del(`/logs/${fake.entryId}`);
				})
				.then(res => {
					expect(res.status).to.equal(200);
					
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
				.del(`/logs/${entryId}`)
				.then(res => {
					expect(res.status).to.equal(404);
					done();
				})
				.catch(done);
		});

		it('Will return Server Error if the database fails', done => {
			done();
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

			Bluebird.all([logEntries[0].save(), logEntries[1].save(), logEntries[2].save()])
				.then(res => {
					fakes[0].entryId = res[0].id;
					fakes[1].entryId = res[1].id;
					fakes[2].entryId = res[2].id;

					fakes[0].weight = { amount: 69.4 };
					fakes[1].maxDepth = 300;
					fakes[2].site = 'Local swimming pool';

					return request(App)
						.put(`/logs`)
						.send(fakes);
				})
				.then(res => {
					console.log(res.body);
					console.log(fakes);
					expect(res.status).to.equal(200);
					expect(res.body).to.be.an('Array');
					expect(res.body).to.eql(fakes);

					done();
					// TODO: Verify that records were changed!
				})
				.catch(done);
		});

		it('Will return Not Found if one of the records is missing', done => {
			done();
		});

		it('Will return Bad Request if the array is empty', done => {
			done();
		});

		it('Will return Bad Request if the message body is malformed', done => {
			done();
		});

		it('Will return Bad Request if one of the records is invalid', done => {
			done();
		});

		it('Will return Server Error if the database fails', done => {
			done();
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

			Bluebird.all([logEntries[0].save(), logEntries[1].save(), logEntries[2].save()])
				.then(() => {
					return request(App)
						.del(`/logs`)
						.send([logEntries[0].id, logEntries[1].id, logEntries[2].id]);
				})
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

			Bluebird.all([
					logEntries[0].save(),
					logEntries[1].save(),
					logEntries[2].save()],
					'a2603a50e9ea2b2ce68c8147')
				.then(() => {
					return request(App)
						.del(`/logs`)
						.send([logEntries[0].id, logEntries[1].id, logEntries[2].id]);
				})
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
				.del(`/logs`)
				.send(entryIds)
				.then(res => {
					expect(res.status).to.equal(200);
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if array is empty', done => {
			request(App)
				.del(`/logs`)
				.send([])
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
				.del(`/logs`)
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
			done();
		});
	});
});
