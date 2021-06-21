import { expect } from 'chai';
import fakeLogEntry from '../util/fake-log-entry';
import fakeLogEntryAir from '../util/fake-log-entry-air';
import fakeMongoId from '../util/fake-mongo-id';
import faker from 'faker';
import {
	EntryQueryParamsSchema,
	NewEntrySchema,
	UpdateEntrySchema
} from '../../service/validation/log-entry';

let logEntry = null;
let queryString = null;

function ensureValid(isValid, expectedError) {
	if (expectedError) {
		expect(isValid.error).to.exist;
		expect(isValid.error.details.length).to.be.at.least(1);
		expect(isValid.error.details[0].type).to.equal(expectedError);
	} else {
		expect(isValid.error).to.not.exist;
	}
}

function validateUpdate(expectedError) {
	const isValid = UpdateEntrySchema.validate(logEntry);
	ensureValid(isValid, expectedError);
}

function validateCreate(expectedError) {
	const isValid = NewEntrySchema.validate(logEntry);
	ensureValid(isValid, expectedError);
}

function validateQueryParams(expectedError) {
	const isValid = EntryQueryParamsSchema.validate(queryString);
	ensureValid(isValid, expectedError);
}

describe('Log entry validation', () => {

	beforeEach(() => {
		logEntry = fakeLogEntry();
		delete logEntry.userId;
	});

	describe('Core properties', () => {
		it('Update requires an entry Id', () => {
			delete logEntry.entryId;
			validateUpdate('any.required');
		});

		it('Create does not allow an entry Id', () => {
			logEntry.entryId = fakeMongoId();
			validateCreate('object.unknown');
		});

		it('Entry time is a valid ISO date', () => {
			logEntry.entryTime = 'Tuesday?';
			validateCreate('string.isoDate');
		});

		it('Entry time is required', () => {
			delete logEntry.entryTime;
			validateCreate('any.required');
		});

		it('Dive number is optional', () => {
			delete logEntry.diveNumber;
			validateCreate();
		});

		it('Dive number must be a number', () => {
			logEntry.diveNumber = 'seven';
			validateCreate('number.base');
		});

		it('Dive number must be an integer', () => {
			logEntry.diveNumber = 1.5;
			validateCreate('number.integer');
		});

		it('Dive number must be positive', () => {
			logEntry.diveNumber = 0;
			validateCreate('number.positive');
		});

		it('Bottom time is required', () => {
			delete logEntry.bottomTime;
			validateCreate('any.required');
		});

		it('Bottom time cannot be zero', () => {
			logEntry.bottomTime = 0;
			validateCreate('number.positive');
		});

		it('Bottom time cannot be negative', () => {
			logEntry.bottomTime = -1;
			validateCreate('number.positive');
		});

		it('Bottom time can be fractional', () => {
			logEntry.bottomTime = 29.23;
			logEntry.totalTime = logEntry.bottomTime + 2.3;
			validateCreate();
		});

		it('Total time can be omitted', () => {
			delete logEntry.totalTime;
			validateCreate();
		});

		it('Total time cannot be zero', () => {
			logEntry.bottomTime = 0;
			logEntry.totalTime = 0;
			validateCreate('number.positive');
		});

		it('Total time cannot be negative', () => {
			logEntry.bottomTime = 1;
			logEntry.totalTime = -4;
			validateCreate('number.positive');
		});

		it('Total time can be fractional', () => {
			logEntry.totalTime = logEntry.bottomTime + 7.38;
			validateCreate();
		});

		it('Total time cannot be less than bottom time', () => {
			logEntry.bottomTime += 5;
			logEntry.totalTime = logEntry.bottomTime - 5;
			validateCreate('number.min');
		});

		it('Surface interval is optional', () => {
			delete logEntry.surfaceInterval;
			validateCreate();
		});

		it('Surface interval must be a number', () => {
			logEntry.surfaceInterval = 'seven';
			validateCreate('number.base');
		});

		it('Surface interval must be positive', () => {
			logEntry.surfaceInterval = 0;
			validateCreate('number.positive');
		});

		it('Location is required', () => {
			logEntry.location = '';
			validateCreate('string.empty');
		});

		it('Location must be a string', () => {
			logEntry.location = true;
			validateCreate('string.base');
		});

		it('Location cannot exceed 200 characters', () => {
			logEntry.location = faker.lorem.paragraph(7);
			validateCreate('string.max');
		});

		it('Site is required', () => {
			logEntry.site = '';
			validateCreate('string.empty');
		});

		it('Site cannot exceed 200 characters', () => {
			logEntry.site = faker.lorem.paragraph(7);
			validateCreate('string.max');
		});

		it('Average depth cannot be zero', () => {
			logEntry.averageDepth = 0;
			validateCreate('number.positive');
		});

		it('Average depth cannot be negative', () => {
			logEntry.averageDepth = -3;
			validateCreate('number.positive');
		});

		it('Average depth can be fractional', () => {
			logEntry.averageDepth = logEntry.maxDepth - 2.23;
			validateCreate();
		});

		it('Max depth is required', () => {
			delete logEntry.maxDepth;
			validateCreate('any.required');
		});

		it('Max depth cannot be zero', () => {
			delete logEntry.averageDepth;
			logEntry.maxDepth = 0;
			validateCreate('number.positive');
		});

		it('Max depth cannot be negative', () => {
			delete logEntry.averageDepth;
			logEntry.maxDepth = -22;
			validateCreate('number.positive');
		});

		it('Max depth can be fractional', () => {
			logEntry.maxDepth += 14.35;
			validateCreate();
		});

		it('Max depth cannot be less than average depth', () => {
			logEntry.maxDepth = logEntry.averageDepth - 2;
			validateCreate('number.min');
		});

		it('Tags must be an array', () => {
			logEntry.tags = 'tag1, tag2';
			validateCreate('array.base');
		});

		it('Tags array cannot be sparse', () => {
			logEntry.tags = [
				'night',
				'reef',
				null,
				'livingTheDream'
			];

			validateCreate('string.base');
		});

		it('Tags array cannot contain empty strings', () => {
			logEntry.tags = [
				'night',
				'reef',
				'',
				'livingTheDream'
			];

			validateCreate('string.empty');
		});

		it('Tags must be strings', () => {
			logEntry.tags = [ 7 ];
			validateCreate('string.base');
		});

		it('Tags cannot be more than 25 characters', () => {
			logEntry.tags = [ 'long'.padEnd(26, '1') ];
			validateCreate('string.max');
		});

		it('Tags must be alphanumeric', () => {
			logEntry.tags = [ 'ok', 'not_ok' ];
			validateCreate('string.pattern.base');
		});

		it('Tags collection cannot have more than 50 tags', () => {
			logEntry.tags = new Array(51).fill('lol');
			validateCreate('array.max');
		});

		it('Comments is optional', () => {
			delete logEntry.comments;
			validateCreate();
		});

		it('Comments must be a string', () => {
			logEntry.comments = 87;
			validateCreate('string.base');
		});

		it('Comments cannot exceed 1000 characters', () => {
			logEntry.comments = 'long'.padEnd(1001, '#');
			validateCreate('string.max');
		});
	});

	describe('GPS', () => {
		it('Latitude and longitude are optional', () => {
			delete logEntry.gps;
			validateCreate();
		});

		it('Latitude must be a number', () => {
			logEntry.gps.latitude = 'north';
			validateCreate('number.base');
		});

		it('Latitude cannot be less than -90', () => {
			logEntry.gps.latitude = -90.1;
			validateCreate('number.min');
		});

		it('Latitude cannot be more than 90', () => {
			logEntry.gps.latitude = 90.1;
			validateCreate('number.max');
		});

		it('Longitude must be a number', () => {
			logEntry.gps.longitude = 'west';
			validateCreate('number.base');
		});

		it('Longitude cannot be less than -180', () => {
			logEntry.gps.longitude = -180.1;
			validateCreate('number.min');
		});

		it('Longitude cannot be more than 180', () => {
			logEntry.gps.longitude = 180.1;
			validateCreate('number.max');
		});

		it('Latitude is required if longitude is specified', () => {
			delete logEntry.gps.latitude;
			validateCreate('any.required');
		});

		it('Longitude is required if latitude is specified', () => {
			delete logEntry.gps.longitude;
			validateCreate('any.required');
		});
	});

	describe('Air', () => {
		it('Air is optional', () => {
			delete logEntry.air;
			validateCreate();
		});

		it('Air array can be null', () => {
			logEntry.air = null;
			validateCreate();
		});

		it('Air array cannot have more than 20 entries', () => {
			const airEntries = new Array(21);
			for (let i = 0; i < airEntries.length; i++) {
				airEntries[i] = fakeLogEntryAir();
			}
			logEntry.air = airEntries;
			validateCreate('array.max');
		});

		it('Air array can be empty', () => {
			logEntry.air = [];
			validateCreate();
		});

		it('Air in is optional', () => {
			delete logEntry.air[0].in;
			validateCreate();
		});

		it('Air in must be a number', () => {
			logEntry.air[0].in = 'seven';
			validateCreate('number.base');
		});

		it('Air in must be positive', () => {
			logEntry.air[0].in = 0;
			validateCreate('number.positive');
		});

		it('Air out is optional', () => {
			delete logEntry.air[0].out;
			validateCreate();
		});

		it('Air out must be a number', () => {
			logEntry.air[0].out = 'seven';
			validateCreate('number.base');
		});

		it('Air out must be positive', () => {
			logEntry.air[0].out = 0;
			validateCreate('number.positive');
		});

		it('Air out must be less than air in', () => {
			logEntry.air[0].out = logEntry.air[0].in + 5;
			validateCreate('number.max');
		});

		it('Air count is optional', () => {
			delete logEntry.air[0].count;
			validateCreate();
		});

		it('Air count must be a number', () => {
			logEntry.air[0].count = 'doubles';
			validateCreate('number.base');
		});

		it('Air count must be positive', () => {
			logEntry.air[0].count = 0;
			validateCreate('number.positive');
		});

		it('Air count must be an integer', () => {
			logEntry.air[0].count = 1.5;
			validateCreate('number.integer');
		});

		it('Air count cannot be greater than 10', () => {
			logEntry.air[0].count = 11;
			validateCreate('number.max');
		});

		it('Air name is optional', () => {
			delete logEntry.air[0].name;
			validateCreate();
		});

		it('Air name must be a string', () => {
			logEntry.air[0].name = 767;
			validateCreate('string.base');
		});

		it('Air name cannot be empty', () => {
			logEntry.air[0].name = '';
			validateCreate('string.empty');
		});

		it('Air name can be null', () => {
			logEntry.air[0].name = null;
			validateCreate();
		});

		it('Air name cannot be longer than 200 characters', () => {
			logEntry.air[0].name = faker.lorem.sentences(10).substr(0, 201);
			validateCreate('string.max');
		});

		it('Air size is optional', () => {
			delete logEntry.air[0].size;
			validateCreate();
		});

		it('Air size can be null', () => {
			logEntry.air[0].size = null;
			validateCreate();
		});

		it('Air size must be a number', () => {
			logEntry.air[0].size = '11.1L';
			validateCreate('number.base');
		});

		it('Air size must be positive', () => {
			logEntry.air[0].size = 0;
			validateCreate('number.positive');
		});

		it('Air working pressure is optional', () => {
			delete logEntry.air[0].workingPressure;
			validateCreate();
		});

		it('Air working pressure can be null', () => {
			logEntry.air[0].workingPressure = null;
			validateCreate();
		});

		it('Air working pressure must be a number', () => {
			logEntry.air[0].workingPressure = '3000psi';
			validateCreate('number.base');
		});

		it('Air working pressure must be positive', () => {
			logEntry.air[0].workingPressure = 0;
			validateCreate('number.positive');
		});

		it('Air tank material is optional', () => {
			delete logEntry.air[0].material;
			validateCreate();
		});

		[ 'al', 'fe', null ].forEach(m => {
			it(`Air tank material can be set to "${ m }"`, () => {
				logEntry.air[0].material = m;
				validateCreate();
			});
		});

		it('Air tank material cannot be set to an invalid value', () => {
			logEntry.air[0].material = 'adamantium';
			validateCreate('any.only');
		});

		it('Oxygen content is optional', () => {
			delete logEntry.air[0].oxygen;
			validateCreate();
		});

		it('Oxygen content must be a number', () => {
			logEntry.air[0].oxygen = 'hyperoxic';
			validateCreate('number.base');
		});

		it('Oxygen content must be positive', () => {
			logEntry.air[0].oxygen = 0;
			validateCreate('number.positive');
		});

		it('Oxygen content cannot exceed 100%', () => {
			logEntry.air[0].oxygen = 100.6;
			validateCreate('number.max');
		});

		it('Helium content is optional', () => {
			delete logEntry.air[0].helium;
			validateCreate();
		});

		it('Helium content must be a number', () => {
			logEntry.air[0].helium = 'lots';
			validateCreate('number.base');
		});

		it('Helium content can be zero', () => {
			logEntry.air[0].helium = 0;
			validateCreate();
		});

		it('Helium content cannot be negative', () => {
			logEntry.air[0].helium = -0.5;
			validateCreate('number.min');
		});

		it('Helium cannot exceed 95%', () => {
			logEntry.air[0].helium = 95.3;
			validateCreate('number.max');
		});
	});

	describe('Weight', () => {
		[ 'belt', 'integrated', 'backplate', 'ankles', 'other' ].forEach(field => {
			it(`${ field } weight is optional`, () => {
				delete logEntry.weight[field];
				validateCreate();
			});

			it(`${ field } weight can be null`, () => {
				logEntry.weight[field] = null;
				validateCreate();
			});

			it(`${ field } weight must be a number`, () => {
				logEntry.weight[field] = '6kg';
				validateCreate('number.base');
			});

			it(`${ field } weight can be zero`, () => {
				logEntry.weight[field] = 0;
				validateCreate();
			});

			it(`${ field } weight cannot be negative`, () => {
				logEntry.weight[field] = -0.5;
				validateCreate('number.min');
			});
		});

		it('Correctness is optional', () => {
			delete logEntry.weight.correctness;
			validateCreate();
		});

		[ 'good', 'too little', 'too much' ].forEach(c => {
			it(`Correctness can be ${ c }`, () => {
				logEntry.weight.correctness = c;
				validateCreate();
			});
		});

		it('Correctness cannot be an invalid value', () => {
			logEntry.weight.correctness = 'not bad';
			validateCreate('any.only');
		});

		it('Trim is optional', () => {
			delete logEntry.weight.trim;
			validateCreate();
		});

		[ 'good', 'feet down', 'feet up' ].forEach(t => {
			it(`Trim can be ${ t }`, () => {
				logEntry.weight.trim = t;
				validateCreate();
			});
		});

		it('Trim cannot be an invalid value', () => {
			logEntry.weight.trim = 'nailed it!';
			validateCreate('any.only');
		});
	});

	describe('Temperature', () => {
		it('Surface temp is optional', () => {
			delete logEntry.temperature.surface;
			validateCreate();
		});

		it('Surface temp must be a number', () => {
			logEntry.temperature.surface = 'hot';
			validateCreate('number.base');
		});

		it('Surface temperatures cannot be less than -2', () => {
			logEntry.temperature.surface = -2.5;
			validateCreate('number.min');
		});

		it('Surface temperatures cannot be more than 50', () => {
			logEntry.temperature.surface = 50.1;
			validateCreate('number.max');
		});

		it('Water temp is optional', () => {
			delete logEntry.temperature.water;
			validateCreate();
		});

		it('Water temp must be a number', () => {
			logEntry.temperature.water = 'chilly';
			validateCreate('number.base');
		});

		it('Water temperatures cannot be less than -2', () => {
			logEntry.temperature.water = -2.5;
			validateCreate('number.min');
		});

		it('Water temperatures cannot be more than 50', () => {
			logEntry.temperature.water = 50.1;
			validateCreate('number.max');
		});

		it('Thermoclines must be an array', () => {
			logEntry.temperature.thermoclines = 9;
			validateCreate('array.base');
		});

		it('Thermocline array cannot be sparse', () => {
			logEntry.temperature.thermoclines = [ null ];
			validateCreate('object.base');
		});

		it('Thermocline values must be objects', () => {
			logEntry.temperature.thermoclines = [ 'cold' ];
			validateCreate('object.base');
		});

		it('Thermocline temperatures are required', () => {
			logEntry.temperature.thermoclines = [ { depth: 12 } ];
			validateCreate('any.required');
		});

		it('Thermocline temperatures must be a number', () => {
			logEntry.temperature.thermoclines = [ { temperature: 'cold' } ];
			validateCreate('number.base');
		});

		it('Thermocline temperatures cannot be less than -2', () => {
			logEntry.temperature.thermoclines = [ { temperature: -2.5 } ];
			validateCreate('number.min');
		});

		it('Thermocline temperatures cannot be more than 50', () => {
			logEntry.temperature.thermoclines = [ { temperature: 50.1 } ];
			validateCreate('number.max');
		});

		it('Depth must be a number', () => {
			logEntry.temperature.thermoclines = [ { temperature: 12, depth: 'not deep' } ];
			validateCreate('number.base');
		});

		it('Depth must be positive', () => {
			logEntry.temperature.thermoclines = [ { temperature: 12, depth: 0 } ];
			validateCreate('number.positive');
		});

		it('Thermoclines array cannot contain more than 4 entries', () => {
			logEntry.temperature.thermoclines = new Array(5);
			for (let i = 0; i < logEntry.temperature.thermoclines.length; i++) {
				logEntry.temperature.thermoclines[i] = {
					depth: i * 4 + 5,
					temperature: 20 - (i * 3)
				};
			}

			validateCreate('array.max');
		});
	});

	describe('Conditions', () => {
		[ 'rating', 'visibility', 'wind', 'current', 'waterChoppiness' ].forEach(field => {
			it(`${ field } is optional`, () => {
				delete logEntry[field];
				validateCreate();
			});

			it(`${ field } can be null`, () => {
				logEntry[field] = null;
				validateCreate();
			});

			it(`${ field } must be a number`, () => {
				logEntry[field] = '2stars';
				validateCreate('number.base');
			});

			it(`${ field } cannot be less than one`, () => {
				logEntry[field] = 0.8;
				validateCreate('number.min');
			});

			it(`${ field } cannot be more than five`, () => {
				logEntry[field] = 5.1;
				validateCreate('number.max');
			});
		});

		[ 'weather', 'suit' ].forEach(field => {
			it(`${ field } is optional`, () => {
				delete logEntry[field];
				validateCreate();
			});

			it(`${ field } can be null`, () => {
				logEntry[field] = null;
				validateCreate();
			});

			it(`${ field } must be a string`, () => {
				logEntry[field] = 78;
				validateCreate('string.base');
			});

			it(`${ field } cannot be empty`, () => {
				logEntry[field] = '';
				validateCreate('string.empty');
			});

			it(`${ field } cannot be more than 100 characters`, () => {
				logEntry[field] = faker.lorem.sentences(10).substr(0, 101);
				validateCreate('string.max');
			});
		});
	});

	describe('Deco Stops', () => {
		it('Deco stops must be an array', () => {
			logEntry.decoStops = {
				depth: 3,
				duration: 3
			};
			validateCreate('array.base');
		});

		it('Deco stops duration is optional', () => {
			delete logEntry.decoStops[0].duration;
			validateCreate();
		});

		it('Deco stops duration must be a number', () => {
			logEntry.decoStops[0].duration = '3min';
			validateCreate('number.base');
		});

		it('Deco stops duration must be positive', () => {
			logEntry.decoStops[0].duration = 0;
			validateCreate('number.positive');
		});

		it('Deco stops depth is optional', () => {
			delete logEntry.decoStops[0].depth;
			validateCreate();
		});

		it('Deco stops depth must be a number', () => {
			logEntry.decoStops[0].depth = '3m';
			validateCreate('number.base');
		});

		it('Deco stops depth must be positive', () => {
			logEntry.decoStops[0].depth = 0;
			validateCreate('number.positive');
		});

		it('Deco stops cannot contain more than 15 entries', () => {
			logEntry.decoStops = new Array(16);
			for (let i = 0; i < logEntry.decoStops.length; i++) {
				logEntry.decoStops[i] = {
					depth: 50 - (i * 3 + 3),
					duration: 5
				};
			}

			validateCreate('array.max');
		});
	});
});

describe('Entry query params validation', () => {
	beforeEach(() => {
		queryString = {
			count: 250,
			sortBy: 'bottomTime',
			sortOrder: 'asc'
		};
	});

	it('Query must be a string', () => {
		queryString.query = 4324;
		validateQueryParams('string.base');
	});

	it('Validation succeeds if request is valid', () => {
		validateQueryParams();
	});

	it('Count must be a number', () => {
		queryString.count = 'thirty-three';
		validateQueryParams('number.base');
	});

	it('Count must be at least 1', () => {
		queryString.count = 0;
		validateQueryParams('number.min');
	});

	it('Count must be no more than 1000', () => {
		queryString.count = 1001;
		validateQueryParams('number.max');
	});

	it('Count cannot be fractional', () => {
		queryString.count = 100.5;
		validateQueryParams('number.integer');
	});

	[ 'entryTime', 'maxDepth', 'bottomTime' ].forEach(field => {
		it(`sortBy can be set to ${ field }`, () => {
			queryString.sortBy = field;
			validateQueryParams();
		});
	});

	it('sortBy cannot be an invalid value', () => {
		queryString.sortBy = 'somethingElse';
		validateQueryParams('any.only');
	});

	[ 'asc', 'desc' ].forEach(order => {
		it(`sortOrder can be set to ${ order }`, () => {
			queryString.sortOrder = order;
			validateQueryParams();
		});
	});

	it('sortOrder cannot be an invalid value', () => {
		queryString.sortOrder = 'up';
		validateQueryParams('any.only');
	});

	it('If sortBy is included sortOrder is required', () => {
		delete queryString.sortOrder;
		validateQueryParams('object.and');
	});

	it('If sortOrder is included then sortBy is required', () => {
		delete queryString.sortBy;
		validateQueryParams('object.and');
	});

	it('Skip must be a number', () => {
		queryString.skip = 'two';
		validateQueryParams('number.base');
	});

	it('Skip cannot be negative', () => {
		queryString.skip = -1;
		validateQueryParams('number.min');
	});

	it('Skip can be zero', () => {
		queryString.skip = 0;
		validateQueryParams();
	});

	it('Skip can be positive', () => {
		queryString.skip = 500;
		validateQueryParams();
	});
});
