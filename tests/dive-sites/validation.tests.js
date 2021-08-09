/* eslint max-statements: 0 */

import {
	DiveSiteRatingSchema,
	DiveSiteSchema,
	DiveSiteSearchSchema,
	ListDiveSiteRatingsSchema
} from '../../service/validation/site';
import { expect } from 'chai';
import fakeDiveSite from '../util/fake-dive-site';
import fakeDiveSiteRating from '../util/fake-dive-site-rating';
import faker from 'faker';

const VeryLongString = faker.lorem.paragraphs(7).substr(0, 1001);
const LongString100 = VeryLongString.substr(0, 101);
const LongString200 = VeryLongString.substr(0, 201);

function ensureValid(isValid, expectedError) {
	if (expectedError) {
		expect(isValid.error).to.exist;
		expect(isValid.error.details.length).to.be.at.least(1);
		expect(isValid.error.details[0].type).to.equal(expectedError);
	} else {
		expect(isValid.error).to.not.exist;
	}
}

describe('Dive Site Validation', () => {
	describe('Dive Site', () => {
		let diveSite = null;

		function validateDiveSite(expectedError) {
			const isValid = DiveSiteSchema.validate(diveSite);
			ensureValid(isValid, expectedError);
		}

		beforeEach(() => {
			diveSite = fakeDiveSite();
			delete diveSite.owner;
		});

		it('Name is required', () => {
			delete diveSite.name;
			validateDiveSite('any.required');
		});

		it('Name cannot be empty', () => {
			diveSite.name = '';
			validateDiveSite('string.empty');
		});

		it('Name must be a string', () => {
			diveSite.name = 77;
			validateDiveSite('string.base');
		});

		it('Name can be no longer than 200 characters', () => {
			diveSite.name = LongString200;
			validateDiveSite('string.max');
		});

		it('Location is not required', () => {
			delete diveSite.location;
			validateDiveSite();
		});

		it('Location cannot be empty', () => {
			diveSite.location = '';
			validateDiveSite('string.empty');
		});

		it('Location can be null', () => {
			diveSite.location = null;
			validateDiveSite();
		});

		it('Location must be a string', () => {
			diveSite.location = 77;
			validateDiveSite('string.base');
		});

		it('Location can be no longer than 100 characters', () => {
			diveSite.location = LongString100;
			validateDiveSite('string.max');
		});

		it('Country is not required', () => {
			delete diveSite.country;
			validateDiveSite();
		});

		it('Country cannot be empty', () => {
			diveSite.country = '';
			validateDiveSite('string.empty');
		});

		it('Country can be null', () => {
			diveSite.country = null;
			validateDiveSite();
		});

		it('Country must be a string', () => {
			diveSite.country = 77;
			validateDiveSite('string.base');
		});

		it('Country can be no longer than 100 characters', () => {
			diveSite.country = LongString100;
			validateDiveSite('string.max');
		});

		it('Water must be a string', () => {
			diveSite.water = 8;
			validateDiveSite('any.only');
		});

		[ 'salt', 'fresh', null ].forEach(value => {
			it(`Water can be ${ value }`, () => {
				diveSite.water = value;
				validateDiveSite();
			});
		});

		it('Water cannot be invalid', () => {
			diveSite.water = 'wet';
			validateDiveSite('any.only');
		});

		it('Accessibility must be a string', () => {
			diveSite.accessibility = true;
			validateDiveSite('any.only');
		});

		[ 'shore', 'boat', null ].forEach(value => {
			it(`Accesibility can be ${ value }`, () => {
				diveSite.accessibility = value;
				validateDiveSite();
			});
		});

		it('Accessibility cannot be invalid', () => {
			diveSite.accessibility = 'long drive';
			validateDiveSite('any.only');
		});

		it('Entry fee is optional', () => {
			delete diveSite.entryFee;
			validateDiveSite();
		});

		it('Entry fee can be null', () => {
			diveSite.entryFee = null;
			validateDiveSite();
		});

		it('Entry fee must be a Boolean value', () => {
			diveSite.entryFee = '$6.00';
			validateDiveSite('boolean.base');
		});

		it('Difficulty can be null', () => {
			diveSite.difficulty = null;
			validateDiveSite();
		});

		it('Difficulty must be a number', () => {
			diveSite.difficulty = 'pretty easy';
			validateDiveSite('number.base');
		});

		it('Difficulty cannot be less than 1', () => {
			diveSite.difficulty = 0.9;
			validateDiveSite('number.min');
		});

		it('Difficulty cannot be more than 5', () => {
			diveSite.difficulty = 5.1;
			validateDiveSite('number.max');
		});

		it('Description is not required', () => {
			delete diveSite.description;
			validateDiveSite();
		});

		it('Description cannot be empty', () => {
			diveSite.description = '';
			validateDiveSite('string.empty');
		});

		it('Description can be null', () => {
			diveSite.description = null;
			validateDiveSite();
		});

		it('Description must be a string', () => {
			diveSite.description = 77;
			validateDiveSite('string.base');
		});

		it('Description can be no longer than 1000 characters', () => {
			diveSite.country = VeryLongString;
			validateDiveSite('string.max');
		});

		it('Tags is optional', () => {
			delete diveSite.tags;
			validateDiveSite();
		});

		it('Tags can be empty', () => {
			diveSite.tags = [];
			validateDiveSite();
		});

		it('Tags must be an array', () => {
			diveSite.tags = 'tag1, tag2';
			validateDiveSite('array.base');
		});

		it('Tags array cannot be sparse', () => {
			diveSite.tags = [
				'night',
				'reef',
				null,
				'livingTheDream'
			];

			validateDiveSite('string.base');
		});

		it('Tags array cannot contain empty strings', () => {
			diveSite.tags = [
				'night',
				'reef',
				'',
				'livingTheDream'
			];

			validateDiveSite('string.empty');
		});

		it('Tags must be strings', () => {
			diveSite.tags = [ 7 ];
			validateDiveSite('string.base');
		});

		it('Tags cannot be more than 25 characters', () => {
			diveSite.tags = [ 'long'.padEnd(26, '1') ];
			validateDiveSite('string.max');
		});

		it('Tags must be alphanumeric with spaces allowed', () => {
			diveSite.tags = [ 'ok', 'also ok', 'not_ok!!' ];
			validateDiveSite('string.pattern.base');
		});

		it('Tags collection cannot have more than 50 tags', () => {
			diveSite.tags = new Array(51).fill('lol');
			validateDiveSite('array.max');
		});

		it('GPS is not required', () => {
			delete diveSite.gps;
			validateDiveSite();
		});

		it('Latitude is required', () => {
			delete diveSite.gps.lat;
			validateDiveSite('any.required');
		});

		it('Latitude must be a number', () => {
			diveSite.gps.lat = 'north';
			validateDiveSite('number.base');
		});

		it('Latitude cannot be less than -90', () => {
			diveSite.gps.lat = -90.1;
			validateDiveSite('number.min');
		});

		it('Latitude cannot be more than 90', () => {
			diveSite.gps.lat = 90.1;
			validateDiveSite('number.max');
		});

		it('Longitude is required', () => {
			delete diveSite.gps.lon;
			validateDiveSite('any.required');
		});

		it('Longitude must be a number', () => {
			diveSite.gps.lon = 'west';
			validateDiveSite('number.base');
		});

		it('Longitude cannot be less than -180', () => {
			diveSite.gps.lon = -180.1;
			validateDiveSite('number.min');
		});

		it('Longitude cannot be more than 180', () => {
			diveSite.gps.lon = 180.1;
			validateDiveSite('number.max');
		});
	});

	describe('Dive Site Search', () => {
		let siteSearch = null;

		function validateSiteSearch(expectedError) {
			const isValid = DiveSiteSearchSchema.validate(siteSearch);
			ensureValid(isValid, expectedError);
		}

		beforeEach(() => {
			siteSearch = {
				query: 'warm water drift',
				closeTo: [ -86.94527777777778, 20.5030556 ],
				distance: 70,
				skip: 1500,
				count: 500,
				water: 'salt',
				accessibility: 'boat',
				avoidEntryFee: true,
				maxDifficulty: 4.0,
				minRating: 3.5,
				owner: 'Jason.Bourne33',
				sortBy: 'difficulty',
				sortOrder: 'desc'
			};
		});

		it('Search term is optional', () => {
			delete siteSearch.query;
			validateSiteSearch();
		});

		it('Search term must be a string', () => {
			siteSearch.query = 77;
			validateSiteSearch('string.base');
		});

		it('Search term can be empty', () => {
			siteSearch.query = '';
			validateSiteSearch();
		});

		it('Water type is optional', () => {
			delete siteSearch.water;
			validateSiteSearch();
		});

		[ 'salt', 'fresh' ].forEach(value => {
			it(`Water type can be "${ value }"`, () => {
				siteSearch.water = value;
				validateSiteSearch();
			});
		});

		it('Water type cannot be invalid', () => {
			siteSearch.water = 'muddy';
			validateSiteSearch('any.only');
		});

		it('Accessibility is optional', () => {
			delete siteSearch.accessibility;
			validateSiteSearch();
		});

		[ 'shore', 'boat' ].forEach(value => {
			it(`Accessibility can be "${ value }"`, () => {
				siteSearch.accessibility = value;
				validateSiteSearch();
			});
		});

		it('Accessibility cannot be invalid', () => {
			siteSearch.water = 'long hike';
			validateSiteSearch('any.only');
		});

		it('Avoid entry fee is optional', () => {
			delete siteSearch.avoidEntryFee;
			validateSiteSearch();
		});

		it('Avoid entry fee must be a Boolean value', () => {
			siteSearch.avoidEntryFee = 'yes, please';
			validateSiteSearch('boolean.base');
		});

		it('Max difficulty is optional', () => {
			delete siteSearch.maxDifficulty;
			validateSiteSearch();
		});

		it('Max difficulty must be a number', () => {
			siteSearch.maxDifficulty = 'intermediate';
			validateSiteSearch('number.base');
		});

		it('Max difficulty cannot be less than 1', () => {
			siteSearch.maxDifficulty = 0.9;
			validateSiteSearch('number.min');
		});

		it('Max difficulty cannot be more than 5', () => {
			siteSearch.maxDifficulty = 5.1;
			validateSiteSearch('number.max');
		});

		it('Min rating is optional', () => {
			delete siteSearch.minRating;
			validateSiteSearch();
		});

		it('Min rating must be a number', () => {
			siteSearch.minRating = 'pretty good';
			validateSiteSearch('number.base');
		});

		it('Min rating cannot be less than 1', () => {
			siteSearch.minRating = 0.9;
			validateSiteSearch('number.min');
		});

		it('Min rating cannot be more than 5', () => {
			siteSearch.minRating = 5.1;
			validateSiteSearch('number.max');
		});

		it('closeTo must be an array', () => {
			siteSearch.closeTo = 'Toronto, Canada';
			validateSiteSearch('array.base');
		});

		it('closeTo must have two elements', () => {
			siteSearch.closeTo = [ 0, 0, 0 ];
			validateSiteSearch('array.orderedLength');
			siteSearch.closeTo = [ 0 ];
			validateSiteSearch('array.includesRequiredUnknowns');
		});

		it('closeTo values must be numbers', () => {
			siteSearch.closeTo = [ 'a', 0 ];
			validateSiteSearch('number.base');
			siteSearch.closeTo = [ 0, 'b' ];
			validateSiteSearch('number.base');
		});

		it('closeTo is required if distance is supplied', () => {
			delete siteSearch.closeTo;
			validateSiteSearch('object.with');
		});

		it('closeTo is optional if distance is not supplied', () => {
			delete siteSearch.closeTo;
			delete siteSearch.distance;
			validateSiteSearch();
		});

		it('longitude cannot be less than -180', () => {
			siteSearch.closeTo = [ -180.1, 0 ];
			validateSiteSearch('number.min');
		});

		it('longitude cannot be more than 180', () => {
			siteSearch.closeTo = [ 180.1, 0 ];
			validateSiteSearch('number.max');
		});

		it('latitude cannot be less than -90', () => {
			siteSearch.closeTo = [ 0, -90.1 ];
			validateSiteSearch('number.min');
		});

		it('latitude cannot be more than 90', () => {
			siteSearch.closeTo = [ 0, 90.1 ];
			validateSiteSearch('number.max');
		});

		it('Distance is not required', () => {
			delete siteSearch.distance;
			validateSiteSearch();
		});

		it('Distance must be a number', () => {
			siteSearch.distance = '7km';
			validateSiteSearch('number.base');
		});

		it('Distance must be positive', () => {
			siteSearch.distance = 0;
			validateSiteSearch('number.positive');
		});

		it('Distance cannot be more than 1000km', () => {
			siteSearch.distance = 1001;
			validateSiteSearch('number.max');
		});

		it('Count is not required', () => {
			delete siteSearch.count;
			validateSiteSearch();
		});

		it('Count must be a number', () => {
			siteSearch.count = 'thirty';
			validateSiteSearch('number.base');
		});

		it('Count must be an integer', () => {
			siteSearch.count = 50.7;
			validateSiteSearch('number.integer');
		});

		it('Count must be positive', () => {
			siteSearch.count = 0;
			validateSiteSearch('number.positive');
		});

		it('Count cannot be more than 1000', () => {
			siteSearch.count = 1001;
			validateSiteSearch('number.max');
		});

		it('Skip is not required', () => {
			delete siteSearch.skip;
			validateSiteSearch();
		});

		it('Skip can be zero', () => {
			siteSearch.skip = 0;
			validateSiteSearch();
		});

		it('Skip must be a number', () => {
			siteSearch.skip = 'three';
			validateSiteSearch('number.base');
		});

		it('Skip must be an integer', () => {
			siteSearch.skip = 10.5;
			validateSiteSearch('number.integer');
		});

		it('Skip must be greater than zero', () => {
			siteSearch.skip = -1;
			validateSiteSearch('number.min');
		});

		it('Sort by is not required', () => {
			delete siteSearch.sortBy;
			validateSiteSearch();
		});

		[ 'relevance', 'difficulty', 'rating', 'modified' ].forEach(value => {
			it(`Sort by can be ${ value }`, () => {
				siteSearch.sortBy = value;
				validateSiteSearch();
			});
		});

		it('Sort by cannot be any other value', () => {
			siteSearch.sortBy = 'not_allowed';
			validateSiteSearch('any.only');
		});

		it('Sort order is not required', () => {
			delete siteSearch.sortOrder;
			validateSiteSearch();
		});

		[ 'asc', 'desc' ].forEach(value => {
			it(`Sort order can be ${ value }`, () => {
				siteSearch.sortOrder = value;
				validateSiteSearch();
			});
		});

		it('Sort order cannot be any other value', () => {
			siteSearch.sortOrder = 'not_allowed';
			validateSiteSearch('any.only');
		});
	});
});

describe('Dive Site Rating Validation', () => {
	describe('Rating', () => {
		let rating = null;

		function validateRating(expectedError) {
			const isValid = DiveSiteRatingSchema.validate(rating);
			ensureValid(isValid, expectedError);
		}

		beforeEach(() => {
			rating = fakeDiveSiteRating();
		});

		it('Rating is required', () => {
			delete rating.rating;
			validateRating('any.required');
		});

		it('Rating must be a number', () => {
			rating.rating = 'excellent';
			validateRating('number.base');
		});

		it('Rating cannot be less than 1', () => {
			rating.rating = 0.5;
			validateRating('number.min');
		});

		it('Rating cannot be more than 5', () => {
			rating.rating = 5.5;
			validateRating('number.max');
		});

		it('Comments are optional', () => {
			delete rating.comments;
			validateRating();
		});

		it('Comments can be null', () => {
			rating.comments = null;
			validateRating();
		});

		it('Comments cannot be longer than 1000 characters', () => {
			rating.comments = VeryLongString;
			validateRating('string.max');
		});
	});

	describe('List Ratings', () => {
		let listRatings = null;

		function validateListRatings(expectedError) {
			const isValid = ListDiveSiteRatingsSchema.validate(listRatings);
			ensureValid(isValid, expectedError);
		}

		beforeEach(() => {
			listRatings = {
				count: 500,
				skip: 1500,
				sortBy: 'rating',
				sortOrder: 'asc'
			};
		});

		it('Count is not required', () => {
			delete listRatings.count;
			validateListRatings();
		});

		it('Count must be a number', () => {
			listRatings.count = 'lots';
			validateListRatings('number.base');
		});

		it('Count must be an integer', () => {
			listRatings.count = 500.2;
			validateListRatings('number.integer');
		});

		it('Count must be positive', () => {
			listRatings.count = 0;
			validateListRatings('number.positive');
		});

		it('Count cannot be more than 1000', () => {
			listRatings.count = 1001;
			validateListRatings('number.max');
		});

		it('Skip is optional', () => {
			delete listRatings.skip;
			validateListRatings();
		});

		it('Skip must be a number', () => {
			listRatings.skip = true;
			validateListRatings('number.base');
		});

		it('Skip must be an integer', () => {
			listRatings.skip = 1500.7;
			validateListRatings('number.integer');
		});

		it('Skip cannot be negative', () => {
			listRatings.skip = -1;
			validateListRatings('number.min');
		});

		it('Sort by is optional', () => {
			delete listRatings.sortBy;
			validateListRatings();
		});

		it('Sort by must be a string', () => {
			listRatings.sortBy = 7;
			validateListRatings('any.only');
		});

		[ 'date', 'rating' ].forEach(value => {
			it(`Sort by can be ${ value }`, () => {
				listRatings.sortBy = value;
				validateListRatings();
			});
		});

		it('Sort by cannot be invalid', () => {
			listRatings.sortBy = 'user';
			validateListRatings('any.only');
		});

		it('Sort order is optional', () => {
			delete listRatings.sortOrder;
			validateListRatings();
		});

		it('Sort order must be a string', () => {
			listRatings.sortOrder = 23;
			validateListRatings('any.only');
		});

		[ 'asc', 'desc' ].forEach(value => {
			it(`Sort order can be ${ value }`, () => {
				listRatings.sortOrder = value;
				validateListRatings();
			});
		});

		it('Sort order cannot be invalid', () => {
			listRatings.sortOrder = 'up';
			validateListRatings('any.only');
		});
	});
});
