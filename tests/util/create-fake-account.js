import { App } from '../../service/server';
import faker from 'faker';
import fakeUser from './fake-user';
import { request } from 'chai';
import User from '../../service/data/user';

export default async function (role = 'user', logsVisibility = 'friends-only') {
	const password = faker.internet.password(18, false, null, '*@1Az');
	const fake = fakeUser(password, logsVisibility);
	fake.role = role;

	const user = new User(fake);
	const result = {
		agent: request.agent(App)
	};

	result.user = await user.save();
	await result.agent
		.post('/auth/login')
		.send({
			username: result.user.username,
			password
		});

	return result;
}
