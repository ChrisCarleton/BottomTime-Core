import DiveSiteRating from '../../service/data/site-ratings';
import faker from 'faker';
import moment from 'moment';

export default () => {
	const fake = {
		rating: faker.random.number({ min: 10, max: 50 }) / 10,
		comments: faker.lorem.sentences(3)
	};

	return fake;
};

export function toDiveSiteRating(fake, username) {
	const rating = new DiveSiteRating(fake);
	rating.date = moment(faker.date.past(4)).utc().toDate();
	rating.user = username || faker.internet.userName();
	return rating;
}

