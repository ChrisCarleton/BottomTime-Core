import { App } from '../../service/server';
import request from 'supertest';

export default async function (username, password) {
	const { header } = await request(App)
		.post('/auth/login')
		.send({ username, password })
		.expect(200);

	return [ 'Cookie', header['set-cookie'] ];
}
