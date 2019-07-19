import fakeMongoId from './fake-mongo-id';
import faker from 'faker';
import hexgen from 'hex-generator';
import LogEntryImage from '../../service/data/log-entry-images';

export default () => ({
	title: faker.fake('{{hacker.adjective}} {{hacker.noun}}'),
	description: faker.hacker.phrase(),
	timestamp: faker.date.past(6).toISOString(),
	location: {
		lat: faker.random.number({ min: -900000, max: 900000 }) / 10000,
		lon: faker.random.number({ min: -1800000, max: 1800000 }) / 10000
	}
});

export function toLogEntryImage(fake, logEntry) {
	const entity = new LogEntryImage({
		checksum: hexgen(256),
		extension: faker.random.arrayElement([ '.jpg', '.jpeg', '.png', '.tiff' ]),
		logEntry: logEntry || fakeMongoId()
	});

	entity.assign(fake);
	return entity;
}
