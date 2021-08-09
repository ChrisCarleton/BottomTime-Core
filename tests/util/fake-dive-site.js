import faker from 'faker';
import Site from '../../service/data/sites';

const KnownTags = [
	'shore dive',
	'deep',
	'reef',
	'wreck',
	'cave',
	'cavern',
	'drift',
	'good vis',
	'bad vis',
	'training',
	'ice',
	'altitude',
	'fresh water',
	'salt water',
	'danger'
];

function generateTags() {
	const tagsCount = faker.datatype.number({ min: 1, max: 6 });
	const tags = new Array(tagsCount);
	for (let i = 0; i < tags.length; i++) {
		tags[i] = faker.random.arrayElement(KnownTags);
	}

	return tags;
}

export default userName => {
	let suffix = faker.address.citySuffix();
	suffix = suffix[0].toUpperCase() + suffix.slice(1);
	const name = faker.random.arrayElement([
		`${ faker.commerce.productAdjective() } ${ suffix }`,
		`${ faker.name.firstName() }'s ${ suffix }`
	]);

	const site = {
		owner: userName || faker.internet.userName(),
		name,
		location: faker.address.city(),
		country: faker.address.country(),
		water: faker.random.arrayElement([ 'salt', 'fresh', 'mixed' ]),
		accessibility: faker.random.arrayElement([ 'shore', 'boat' ]),
		entryFee: faker.datatype.boolean(),
		difficulty: faker.datatype.number({ min: 10, max: 50 }) / 10,
		description: faker.lorem.sentences(3),
		tags: generateTags(),
		gps: {
			lon: faker.datatype.number({ min: -1800000, max: 1800000 }) / 10000,
			lat: faker.datatype.number({ min: -900000, max: 900000 }) / 10000
		}
	};

	return site;
};

export function toDiveSite(fake) {
	const site = new Site();
	const now = new Date(Date.now());
	const created = faker.date.past(6, now);
	const updated = faker.date.between(created, now);

	site.assign(fake);
	site.owner = fake.owner;
	site.created = created;
	site.updated = updated;
	return site;
}
