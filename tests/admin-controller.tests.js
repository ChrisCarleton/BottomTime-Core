import { App } from '../service/server';
import chai, { expect } from 'chai';

describe('Admin controller', () => {

	it('Returns health of system', done => {
		chai.request(App)
			.get('/health')
			.then(res => {
				expect(res.status).to.equal(200);
				done();
			})
			.catch(done);
	});

	it('Returns version info accurately', done => {
		chai.request(App)
			.get('/version')
			.then(res => {
				expect(res.status).to.equal(200);
				expect(res.body.appVersion).to.equal('1.0.0');
				expect(res.body.apiVersion).to.equal('1.0.0');
				done();
			})
			.catch(done);
	});

});
