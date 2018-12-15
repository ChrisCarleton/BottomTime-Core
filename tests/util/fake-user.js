import bcrypt from 'bcrypt';
import faker from 'faker';

export default (password) => {
	const firstName = faker.name.firstName();
	const lastName = faker.name.lastName();
	const username = faker.internet.userName(firstName, lastName);
	const email = faker.internet.email(firstName, lastName);
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
