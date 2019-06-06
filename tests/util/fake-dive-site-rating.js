import faker from 'faker';
import moment from 'moment';

export default username => {
	const fake = {
		user: username || faker.internet.userName(),
		date: moment(faker.date.past(4)).utc().toDate(),
		rating: faker.random.number({ min: 10, max: 50 }) / 10,
		comments: faker.lorem.sentences(3)
	};

	return fake;
};
