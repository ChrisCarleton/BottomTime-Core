import fakeMongoId from './fake-mongo-id';
import faker from 'faker';
import LogEntryImage from '../../service/data/log-entry-images';
import path from 'path';

export default () => ({
	title: faker.fake('{{hacker.adjective}} {{hacker.noun}}'),
	description: faker.hacker.phrase(),
	timestamp: faker.date.past(6).toISOString(),
	location: {
		lat: faker.datatype.number({ min: -900000, max: 900000 }) / 10000,
		lon: faker.datatype.number({ min: -1800000, max: 1800000 }) / 10000
	}
});

export function toLogEntryImage(fake, logEntry, imageKey, thumbnailKey) {
	const username = faker.internet.userName();
	logEntry = logEntry || fakeMongoId();

	const entity = new LogEntryImage({
		awsS3Key: imageKey || path.join(
			username,
			logEntry,
			'images',
			faker.fake('{{system.fileName}}{{system.fileExt}}')
		),
		awsS3ThumbKey: thumbnailKey || path.join(
			username,
			logEntry,
			'images',
			faker.fake('{{system.fileName}}-thumb{{system.fileExt}}')
		),
		contentType: faker.system.mimeType(),
		logEntry
	});

	entity.assign(fake);
	return entity;
}
