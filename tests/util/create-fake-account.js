import faker from 'faker';
import fakeUser from './fake-user';
import generateAuthHeader from '../util/generate-auth-header';
import User from '../../service/data/user';

export default async function (role = 'user', logsVisibility = 'friends-only') {
	const password = faker.internet.password(18, false, null, '*@1Az');
	const fake = fakeUser(password, logsVisibility);
	fake.role = role;

	const user = new User(fake);
	await user.save();

	const result = {
		authHeader: await generateAuthHeader(fake.username, password),
		user
	};

	return result;
}
