import faker from 'faker';

export default userId => {
	const bottomTime = faker.random.number({ min: 10, max: 70 });
	const totalTime = faker.random.number({ min: bottomTime, max: bottomTime + 8 });

	const averageDepth = faker.random.number({ min: 15, max: 100 });
	const maxDepth = faker.random.number({ min: averageDepth, max: averageDepth + 30 });

	return {
		userId,
		entryTime: faker.date.past(3).toISOString(),
		bottomTime,
		totalTime,
		location: faker.fake('{{address.city}}{{address.citySuffix}}, {{address.stateAbbr}}'),
		site: faker.fake('{{address.cityPrefix}} {{name.lastName}}'),
		averageDepth,
		maxDepth,
		gps: {
			latitude: faker.random.number({ min: -90.0, max: 90.0 }),
			longitude: faker.random.number({ min: -180.0, max: 180.0 })
		},

		weight: {
			amount: faker.random.number({ min: 2, max: 19 })
		// 	accuracy: faker.random.arrayElement(['Good', 'TooLittle', 'TooMuch']),
		// 	trim: faker.random.arrayElement(['Good', 'HeadDown', 'FeetDown']),
		// 	notes: faker.lorem.paragraph(3)
		}
	};
};
