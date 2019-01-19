import { App } from '../service/server';
import { ErrorIds } from '../service/utils/error-response';
import { expect } from 'chai';
import request from 'supertest';

describe('Server', () => {

	it('Returns Not Found on unexpected route', async () => {
		const res = await request(App).get('/what/is/this/route').expect(404);
		expect(res.body.errorId).to.equal(ErrorIds.notFound);
	});

});
