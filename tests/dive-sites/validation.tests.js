import { DiveSiteSchema, DiveSiteSearchSchema } from '../../service/validation/site';
import { expect } from 'chai';
import fakeDiveSite from '../util/fake-dive-site';
import faker from 'faker';
import Joi from 'joi';

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
			const isValid = Joi.validate(diveSite, DiveSiteSchema);
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
			validateDiveSite('any.empty');
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
			validateDiveSite('any.empty');
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
			validateDiveSite('any.empty');
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

		it('Description is not required', () => {
			delete diveSite.description;
			validateDiveSite();
		});

		it('Description cannot be empty', () => {
			diveSite.description = '';
			validateDiveSite('any.empty');
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

			validateDiveSite('any.empty');
		});

		it('Tags must be strings', () => {
			diveSite.tags = [ 7 ];
			validateDiveSite('string.base');
		});

		it('Tags cannot be more than 25 characters', () => {
			diveSite.tags = [ 'long'.padEnd(26, '1') ];
			validateDiveSite('string.max');
		});

		it('Tags must be alphanumeric', () => {
			diveSite.tags = [ 'ok', 'not_ok' ];
			validateDiveSite('string.alphanum');
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
			delete diveSite.gps.latitude;
			validateDiveSite('any.required');
		});

		it('Latitude must be a number', () => {
			diveSite.gps.latitude = 'north';
			validateDiveSite('number.base');
		});

		it('Latitude cannot be less than -90', () => {
			diveSite.gps.latitude = -90.1;
			validateDiveSite('number.min');
		});

		it('Latitude cannot be more than 90', () => {
			diveSite.gps.latitude = 90.1;
			validateDiveSite('number.max');
		});

		it('Longitude is required', () => {
			delete diveSite.gps.longitude;
			validateDiveSite('any.required');
		});

		it('Longitude must be a number', () => {
			diveSite.gps.longitude = 'west';
			validateDiveSite('number.base');
		});

		it('Longitude cannot be less than -180', () => {
			diveSite.gps.longitude = -180.1;
			validateDiveSite('number.min');
		});

		it('Longitude cannot be more than 180', () => {
			diveSite.gps.longitude = 180.1;
			validateDiveSite('number.max');
		});
	});

	describe('Dive Site Search', () => {
		let siteSearch = null;

		function validateSiteSearch(expectedError) {
			const isValid = Joi.validate(siteSearch, DiveSiteSearchSchema);
			ensureValid(isValid, expectedError);
		}

		beforeEach(() => {
			siteSearch = {
				query: 'warm water drift',
				closeTo: [ -86.94527777777778, 20.5030556 ],
				distance: 70,
				count: 500,
				sortBy: 'name',
				sortOrder: 'asc'
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

		it('Count must be positive', () => {
			siteSearch.count = 0;
			validateSiteSearch('number.positive');
		});

		it('Count cannot be more than 1000', () => {
			siteSearch.count = 1001;
			validateSiteSearch('number.max');
		});

		it('Sort by is not required', () => {
			delete siteSearch.sortBy;
			validateSiteSearch();
		});

		[ 'relevance', 'name' ].forEach(value => {
			it(`Sort by can be ${ value }`, () => {
				siteSearch.sortBy = value;
				validateSiteSearch();
			});
		});

		it('Sort by cannot be any other value', () => {
			siteSearch.sortBy = 'not_allowed';
			validateSiteSearch('any.allowOnly');
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
			validateSiteSearch('any.allowOnly');
		});
	});
});
