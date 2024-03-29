import DiveSiteRating from '../../service/data/site-ratings';
import faker from 'faker';
import moment from 'moment';

export default () => {
	const fake = {
		rating: faker.datatype.number({ min: 10, max: 50 }) / 10,
		comments: faker.lorem.sentences(3)
	};

	return fake;
};

export function toDiveSiteRating(fake, diveSiteId, user) {
	const rating = new DiveSiteRating(fake);
	rating.date = moment(faker.date.past(4)).utc().toDate();
	rating.user = user || faker.internet.userName();
	rating.diveSite = diveSiteId;
	return rating;
}
