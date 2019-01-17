import fakeUser from './fake-user';
import generateAuthHeader from '../util/generate-auth-header';
import User from '../../service/data/user';

export default async function (role = 'user', logsVisibility = 'friends-only') {
	const fake = fakeUser(null, logsVisibility);
	fake.role = role;

	const user = new User(fake);
	const result = {
		authHeader: await generateAuthHeader(fake.username),
		user: await user.save()
	};

	return result;
}
