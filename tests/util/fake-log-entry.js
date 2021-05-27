import fakeLogEntryAir from './fake-log-entry-air';
import faker from 'faker';
import LogEntry from '../../service/data/log-entry';

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
	const tagsCount = faker.datatype.number({ min: 1, max: 6 });
	const tags = new Array(tagsCount);
	for (let i = 0; i < tags.length; i++) {
		tags[i] = faker.random.arrayElement(KnownTags);
	}

	return tags;
}

export default userId => {
	const bottomTime = faker.datatype.number({ min: 10, max: 70 });
	const totalTime = faker.datatype.number({ min: bottomTime, max: bottomTime + 8 });

	const averageDepth = faker.datatype.number({ min: 5, max: 36 });
	const maxDepth = faker.datatype.number({ min: averageDepth, max: averageDepth + 5 });

	return {
		userId,
		entryTime: faker.date.past(3).toISOString(),
		diveNumber: diveNumber++,
		bottomTime,
		totalTime,
		surfaceInterval: faker.datatype.number({ min: 7, max: 120 }),
		location: faker.fake('{{address.city}}{{address.citySuffix}}, {{address.stateAbbr}}'),
		site: faker.fake('{{address.cityPrefix}} {{name.lastName}}'),
		averageDepth,
		maxDepth,
		air: [ fakeLogEntryAir() ],
		decoStops: [
			{
				depth: 3,
				duration: faker.datatype.number({ min: 3, max: 15 })
			}
		],
		gps: {
			latitude: faker.datatype.number({ min: -90.0, max: 90.0 }),
			longitude: faker.datatype.number({ min: -180.0, max: 180.0 })
		},
		weight: {
			belt: faker.datatype.number({ min: 0, max: 27 }) / 10,
			integrated: faker.datatype.number({ min: 0, max: 27 }) / 10,
			backplate: faker.datatype.number({ min: 0, max: 45 }) / 10,
			ankles: faker.datatype.number({ min: 0, max: 90 }) / 100,
			correctness: faker.random.arrayElement([ 'good', 'too little', 'too much' ]),
			trim: faker.random.arrayElement([ 'good', 'feet down', 'feet up' ])
		},
		temperature: {
			surface: faker.datatype.number({ min: 20, max: 35 }),
			water: faker.datatype.number({ min: 3, max: 18 }),
			thermoclines: [
				{
					depth: faker.datatype.number({ min: 15, max: 25 }),
					temperature: faker.datatype.number({ min: -2, max: 3 })
				}
			]
		},
		rating: faker.datatype.number({ min: 1, max: 5 }),
		visibility: faker.datatype.number({ min: 1, max: 5 }),
		wind: faker.datatype.number({ min: 1, max: 5 }),
		current: faker.datatype.number({ min: 1, max: 5 }),
		waterChoppiness: faker.datatype.number({ min: 1, max: 5 }),
		weather: faker.random.arrayElement([
			'Sunny',
			'Cloudy',
			'Partly-Cloudy',
			'Raining',
			'Stormy',
			'Windy'
		]),
		suit: faker.random.arrayElement([
			'Rash guard',
			'Shorty',
			'3mm wetsuit',
			'5mm wetsuit',
			'7mm wetsuit',
			'Drysuit'
		]),
		tags: generateTags(),
		comments: faker.lorem.sentences(4)
	};
};

export function toLogEntry(fake) {
	const entry = new LogEntry(fake);
	if (fake.gps) {
		entry.gps = [
			fake.gps.longitude,
			fake.gps.latitude
		];
	}
	return entry;
}
