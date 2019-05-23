import faker from 'faker';
import Site from '../../service/data/sites';

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
		description: faker.lorem.sentences(3),
		gps: {
			longitude: faker.random.number({ min: -1800000, max: 1800000 }) / 10000,
			latitude: faker.random.number({ min: -900000, max: 900000 }) / 10000
		}
	};

	return site;
};

export function toDiveSite(fake) {
	const site = new Site(fake);
	if (fake.gps) {
		site.gps = [
			fake.gps.longitude,
			fake.gps.latitude
		];
	}
	return site;
}
