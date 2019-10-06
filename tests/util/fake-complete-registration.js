import faker from 'faker';

export default () => {
	const firstName = faker.name.firstName();
	const lastName = faker.name.lastName();

	return {
		username: faker.internet.userName(firstName, lastName).padEnd(6, '3'),
		email: faker.internet.email(firstName, lastName),
		firstName,
		lastName,
		logsVisibility: faker.random.arrayElement([ 'private', 'public', 'friends-only' ]),
		weightUnit: faker.random.arrayElement([ 'kg', 'lbs' ]),
		temperatureUnit: faker.random.arrayElement([ 'c', 'f' ]),
		distanceUnit: faker.random.arrayElement([ 'm', 'ft' ]),
		pressureUnit: faker.random.arrayElement([ 'bar', 'psi' ])
	};
};
