import bcrypt from 'bcrypt';
import faker from 'faker';

export default (password) => {
	const username = faker.internet.userName();
	const email = faker.internet.email();
	password = password || faker.internet.password(12, false);

	return {
		usernameLower: username.toLowerCase(),
		emailLower: email.toLowerCase(),
		username: username,
		email: email,
		createdAt: faker.date.past(5),
		passwordHash: bcrypt.hashSync(password, 5)
	};
};
