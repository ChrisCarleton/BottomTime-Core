import { App } from '../../service/server';
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

	describe('GET /log/:logId', () => {

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
});
