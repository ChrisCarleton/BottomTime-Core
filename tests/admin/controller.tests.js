import { App } from '../../service/server';
import database from '../../service/data/database';
import { expect, request } from 'chai';
import sinon from 'sinon';

const ExpectedAppVersion = '1.0.0';
const ExpectedApiVersion = '1.0.0';

describe('Admin Controller', () => {

	describe('GET /', () => {
		it('Returns the application and API versions', done => {
			request(App)
				.get('/')
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body.appVersion).to.equal(ExpectedAppVersion);
					expect(res.body.apiVersion).to.equal(ExpectedApiVersion);
					done();
				})
				.catch(done);
		});
	});

	describe('GET /health', () => {
		let stub;

		afterEach(() => {
			if(stub) {
				stub.restore();
				stub = null;
			}
		});

		it('Returns healthy when everything is cool', done => {
			request(App)
				.get('/health')
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body.status).to.equal('healthy');
					res.body.components.forEach(c => {
						expect(c.health).to.equal('healthy');
					});
					done();
				})
				.catch(done);
		});

		it('Returns unhealthy when MongoDB is inaccessible', done => {
			stub = sinon.stub(database.connection.db, 'stats');
			stub.rejects('nope!');

			request(App)
				.get('/health')
				.then(res => {
					expect(res.status).to.equal(500);
					expect(res.body.status).to.equal('unhealthy');
					res.body.components.forEach(c => {
						if(c.name === 'MongoDB') {
							expect(c.health).to.equal('unhealthy');
						} else {
							expect(c.health).to.equal('healthy');
						}
					});
					done();
				})
				.catch(done);
		});
	});

});
