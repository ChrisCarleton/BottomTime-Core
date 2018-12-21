import { App } from '../service/server';
import { ErrorIds } from '../service/utils/error-response';
import { expect, request } from 'chai';

describe('Server', () => {

	it('Returns Not Found on unexpected route', done => {
		request(App)
			.get('/what/is/this/route')
			.then(res => {
				expect(res.status).to.equal(404);
				expect(res.body.errorId).to.equal(ErrorIds.notFound);
				done();
			})
			.catch(done);
	});

});
