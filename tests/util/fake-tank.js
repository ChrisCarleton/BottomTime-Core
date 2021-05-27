import faker from 'faker';

export default userId => {
	const tank = {
		name: faker.fake('{{name.firstName}}\'s {{hacker.adjective}} tank'),
		size: faker.datatype.number({ min: 55, max: 197 }) / 10,
		workingPressure: faker.random.arrayElement([ 182, 200, 207, 228, 237 ]),
		material: faker.random.arrayElement([ 'al', 'fe' ])
	};

	if (userId) {
		tank.userId = userId;
	}

	return tank;
};
