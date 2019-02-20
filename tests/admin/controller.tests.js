import { App } from '../../service/server';
import database from '../../service/data/database';
import { expect } from 'chai';
import request from 'supertest';
import sinon from 'sinon';

const ExpectedAppVersion = '1.0.0';
const ExpectedApiVersion = '1.0.0';

describe('Admin Controller', () => {

	describe('GET /', () => {
		it('Returns the application and API versions', async () => {
			const res = await request(App).get('/');
			expect(res.status).to.equal(200);
			expect(res.body.appVersion).to.equal(ExpectedAppVersion);
			expect(res.body.apiVersion).to.equal(ExpectedApiVersion);
		});
	});

	describe('GET /health', () => {
		let stub = null;

		before(async () => {
			// TODO: Ensure Mongo Connection before testing.
		});

		afterEach(() => {
			if (stub) {
				stub.restore();
				stub = null;
			}
		});

		it('Returns healthy when everything is cool', async () => {
			const res = await request(App).get('/health');
			expect(res.status).to.equal(200);
			expect(res.body.status).to.equal('healthy');
			res.body.components.forEach(c => {
				expect(c.health).to.equal('healthy');
			});
		});

		it('Returns unhealthy when MongoDB is inaccessible', async () => {
			stub = sinon.stub(database.connection.db, 'stats');
			stub.rejects('nope!');

			const res = await request(App).get('/health');
			expect(res.status).to.equal(500);
			expect(res.body.status).to.equal('unhealthy');
			res.body.components.forEach(c => {
				if (c.name === 'MongoDB') {
					expect(c.health).to.equal('unhealthy');
				} else {
					expect(c.health).to.equal('healthy');
				}
			});
		});
	});

});
