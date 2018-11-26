import { App } from '../../service/server';
import database from '../../service/data/database';
import { expect, request } from 'chai';
import faker from 'faker';
import fakeLogEntry from '../util/fake-log-entry';
import LogEntry from '../../service/data/log-entry';

describe('Logs Controller', () => {
	describe('GET /log/:logId', () => {

		afterEach(done => {
			// Purge log records.
			LogEntry.deleteMany({}, done);
		});
		
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

					fake._id = res.body._id;
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

	});
});
