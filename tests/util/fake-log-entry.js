import faker from 'faker';

let diveNumber = 1;

const KnownTags = [
	'night',
	'shore',
	'boat',
	'searchAndRescue',
	'deep',
	'reef',
	'wreck',
	'cave',
	'training',
	'ice',
	'altitude',
	'freshWater',
	'saltWater'
];

function generateTags() {
	const tagsCount = faker.random.number({ min: 1, max: 6 });
	const tags = new Array(tagsCount);
	for (let i = 0; i < tags.length; i++) {
		tags[i] = faker.random.arrayElement(KnownTags);
	}

	return tags;
}

export default userId => {
	const bottomTime = faker.random.number({ min: 10, max: 70 });
	const totalTime = faker.random.number({ min: bottomTime, max: bottomTime + 8 });

	const averageDepth = faker.random.number({ min: 5, max: 36 });
	const maxDepth = faker.random.number({ min: averageDepth, max: averageDepth + 5 });

	return {
		userId,
		entryTime: faker.date.past(3).toISOString(),
		diveNumber: diveNumber++,
		bottomTime,
		totalTime,
		surfaceInterval: faker.random.number({ min: 7, max: 120 }),
		location: faker.fake('{{address.city}}{{address.citySuffix}}, {{address.stateAbbr}}'),
		site: faker.fake('{{address.cityPrefix}} {{name.lastName}}'),
		averageDepth,
		maxDepth,
		air: {
			in: faker.random.number({ min: 200, max: 215 }),
			out: faker.random.number({ min: 32, max: 40 }),
			doubles: faker.random.boolean(),
			volume: faker.random.arrayElement([ 40, 80, 100, 120 ]),
			volumeUnit: 'cf',
			material: faker.random.arrayElement([ 'aluminum', 'steel' ]),
			oxygen: faker.random.number({ min: 21, max: 40 }),
			helium: 0
		},
		decoStops: [
			{
				depth: 3,
				duration: faker.random.number({ min: 3, max: 15 })
			}
		],
		gps: {
			latitude: faker.random.number({ min: -90.0, max: 90.0 }),
			longitude: faker.random.number({ min: -180.0, max: 180.0 })
		},
		weight: {
			amount: faker.random.number({ min: 2, max: 19 }),
			correctness: faker.random.arrayElement([ 'good', 'too little', 'too much' ]),
			trim: faker.random.arrayElement([ 'good', 'feet down', 'feet up' ])
		},
		temperature: {
			surface: faker.random.number({ min: 20, max: 35 }),
			water: faker.random.number({ min: 3, max: 18 }),
			thermoclines: [
				{
					depth: faker.random.number({ min: 15, max: 25 }),
					temperature: faker.random.number({ min: -2, max: 3 })
				}
			]
		},
		tags: generateTags(),
		comments: faker.lorem.sentences(4)
	};
};
