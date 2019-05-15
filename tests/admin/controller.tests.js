import { App } from '../../service/server';
import database from '../../service/data/database';
import { expect } from 'chai';
import request from 'supertest';
import sinon from 'sinon';
import storage from '../../service/storage';

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

		afterEach(() => {
			if (stub) {
				stub.restore();
				stub = null;
			}
		});

		it('Returns healthy when everything is cool', async () => {
			const { body } = await request(App).get('/health').expect(200);
			expect(body.status).to.equal('healthy');
			expect(body.components).to.be.an('array').and.have.lengthOf(2);
			body.components.forEach(c => {
				expect(c.health).to.equal('healthy');
			});
		});

		it('Returns unhealthy when MongoDB is inaccessible', async () => {
			stub = sinon.stub(database.connection.db, 'stats');
			stub.rejects('nope!');

			const { body } = await request(App).get('/health').expect(500);
			expect(body.status).to.equal('unhealthy');
			body.components.forEach(c => {
				if (c.name === 'MongoDB') {
					expect(c.health).to.equal('unhealthy');
				} else {
					expect(c.health).to.equal('healthy');
				}
			});
		});

		it('Returns warn when S3 is inaccessible', async () => {
			stub = sinon.stub(storage, 'putObject');
			stub.returns({
				promise: () => Promise.reject(new Error('nope'))
			});

			const { body } = await request(App).get('/health').expect(200);
			expect(body.status).to.equal('warn');
			body.components.forEach(c => {
				if (c.name === 'AWS S3') {
					expect(c.health).to.equal('warn');
				} else {
					expect(c.health).to.equal('healthy');
				}
			});
		});
	});

});
