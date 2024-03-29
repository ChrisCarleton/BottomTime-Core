import { App } from '../../service/server';
import DiveSite from '../../service/data/sites';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import fakeDiveSite, { toDiveSite } from '../util/fake-dive-site';
import faker from 'faker';
import getDistance from 'geolib/es/getDistance';
import request from 'supertest';
import sinon from 'sinon';

let stub = null;

const CozumelDiveSites = [
	[ -86.90640, 20.57437 ],
	[ -87.02251, 20.30431 ],
	[ -87.02341, 20.40478 ],
	[ -87.02810, 20.36740 ],
	[ -87.02234, 20.40911 ]
];

const RoatanDiveSites = [
	[ -86.56756, 16.33097 ],
	[ -86.52997, 16.32976 ],
	[ -86.56913, 16.33683 ],
	[ -86.56435, 16.33930 ]
];

function toGps(arr) {
	return {
		lon: arr[0],
		lat: arr[1]
	};
}

const SanMiguelDeCozumel = [ -86.9502806, 20.5109306 ];

function validateDistances(body, distance) {
	body.forEach(site => {
		const measuredDistance = getDistance(
			{ latitude: SanMiguelDeCozumel[1], longitude: SanMiguelDeCozumel[0] },
			{ latitude: site.gps.lat, longitude: site.gps.lon }
		) / 1000;
		expect(measuredDistance).to.be.at.most(distance);
	});
}

describe('Searching Dive Sites', () => {
	const fakes = new Array(800);
	const diveSites = new Array(fakes.length);

	before(async () => {
		for (let i = 0; i < fakes.length; i++) {
			fakes[i] = fakeDiveSite(faker.random.arrayElement([ 'mike', 'kevin', null ]));
			fakes[i].gps = toGps(faker.random.arrayElement([
				faker.random.arrayElement(CozumelDiveSites),
				faker.random.arrayElement(RoatanDiveSites)
			]));
			diveSites[i] = toDiveSite(fakes[i]);
			diveSites[i].avgRating = faker.datatype.number({ min: 10, max: 50 }) / 10;
		}

		await DiveSite.deleteMany({});
		await DiveSite.insertMany(diveSites);
		await DiveSite.esSynchronize();
	});

	afterEach(() => {
		if (stub) {
			stub.restore();
			stub = null;
		}
	});

	after(async () => {
		await DiveSite.deleteMany({});
		await DiveSite.esSynchronize();
	});

	it('Full text search returns results', async () => {
		const query = 'deep';
		const { body } = await request(App)
			.get('/diveSites')
			.query({ query, count: 20 })
			.expect(200);

		expect(body).to.be.an('array').and.not.be.empty;
		expect(body).to.be.descendingBy('score');
	});

	it('Results can be filtered by owner', async () => {
		const { body } = await request(App)
			.get('/diveSites')
			.query({ owner: 'kevin', count: 10 })
			.expect(200);

		expect(body).to.be.an('array').and.not.be.empty;
		body.forEach(site => {
			expect(site.owner).to.equal('kevin');
		});
	});

	[ 'fresh', 'salt', 'mixed' ].forEach(water => {
		it(`Results can be filtered by ${ water } water sites`, async () => {
			const { body } = await request(App)
				.get('/diveSites')
				.query({ water, count: 10 })
				.expect(200);

			expect(body).to.be.an('array').and.not.be.empty;
			body.forEach(site => {
				expect(site.water).to.equal(water);
			});
		});
	});

	[ 'shore', 'boat' ].forEach(accessibility => {
		it(`Results can be filtered by ${ accessibility } access.`, async () => {
			const { body } = await request(App)
				.get('/diveSites')
				.query({ accessibility, count: 10 })
				.expect(200);

			expect(body).to.be.an('array').and.not.be.empty;
			body.forEach(site => {
				expect(site.accessibility).to.equal(accessibility);
			});
		});
	});

	it('Results can be filtered to avoid sites with entry fees', async () => {
		const { body } = await request(App)
			.get('/diveSites')
			.query({ avoidEntryFee: true, count: 10 })
			.expect(200);

		expect(body).to.be.an('array').and.not.be.empty;
		body.forEach(site => {
			expect(site.entryFee).to.be.false;
		});
	});

	it('Results can be filtered by maximum difficulty', async () => {
		const maxDifficulty = 3.5;
		const { body } = await request(App)
			.get('/diveSites')
			.query({ maxDifficulty, count: 10 })
			.expect(200);

		expect(body).to.be.an('array').and.not.be.empty;
		body.forEach(site => {
			expect(site.difficulty).to.be.at.most(maxDifficulty);
		});
	});

	it('Results can be filtered by minimum average rating', async () => {
		const minRating = 3.8;
		const { body } = await request(App)
			.get('/diveSites')
			.query({ minRating, count: 10 })
			.expect(200);

		expect(body).to.be.an('array').and.not.be.empty;
		body.forEach(site => {
			expect(site.avgRating).to.be.at.least(minRating);
		});
	});

	[ 'relevance', 'difficulty', 'rating', 'modified' ].forEach(sortBy => {
		[ 'asc', 'desc' ].forEach(sortOrder => {
			it(`Results can be ordered by ${ sortBy } (${ sortOrder })`, async () => {
				const count = 25;
				const { body } = await request(App)
					.get('/diveSites')
					.query({ sortBy, sortOrder, count })
					.expect(200);

				let sortProperty = 'score';
				switch (sortBy) {
				case 'difficulty':
					sortProperty = 'difficulty';
					break;
				case 'rating':
					sortProperty = 'avgRating';
					break;
				case 'modified':
					sortProperty = 'updated';
					break;
				default:
					break;
				}

				expect(body).to.be.an('array').and.have.lengthOf(count);
				expect(body).to.be.sortedBy(
					sortProperty,
					{ descending: sortOrder === 'desc' }
				);
			});
		});
	});

	it('Geo searches work', async () => {
		const { body } = await request(App)
			.get('/diveSites')
			.query({
				closeTo: `[${ SanMiguelDeCozumel.join(',') } ]`,
				distance: 25,
				count: 20
			})
			.expect(200);

		expect(body).to.be.an('array').and.not.be.empty;
		validateDistances(body, 25);
	});

	it('Geo searches work with default distance', async () => {
		const { body } = await request(App)
			.get('/diveSites')
			.query({
				closeTo: `[${ SanMiguelDeCozumel.join(',') } ]`,
				count: 20
			})
			.expect(200);

		expect(body).to.be.an('array').and.not.be.empty;
		validateDistances(body, 50);
	});

	it('Complex searches with multiple criteria work', async () => {
		const { body } = await request(App)
			.get('/diveSites')
			.query({
				query: 'deep',
				closeTo: `[${ SanMiguelDeCozumel.join(',') } ]`,
				water: 'salt',
				accessibility: 'boat',
				minRating: 2.0,
				distance: 70,
				count: 20
			})
			.expect(200);

		expect(body).to.be.an('array').and.not.be.empty;
		validateDistances(body, 70);
	});

	it('Another page of results can be returned', async () => {
		const query = 'drift';
		let response = await request(App)
			.get('/diveSites')
			.query({ query, count: 20 })
			.expect(200);
		const first = response.body;

		expect(first).to.be.an('array').and.not.be.empty;
		expect(first).to.be.descendingBy('score');

		response = await request(App)
			.get('/diveSites')
			.query({ query, count: 20, skip: 20 })
			.expect(200);
		const second = response.body;

		expect(second).to.be.an('array').and.not.be.empty;
		expect(second).to.be.descendingBy('score');
	});

	it('Will return 400 if the query parameters are invalid', async () => {
		const { body } = await request(App)
			.get('/diveSites')
			.query({
				sortBy: 'elevation'
			})
			.expect(400);

		expect(body.status).to.equal(400);
		expect(body.errorId).to.equal(ErrorIds.badRequest);
	});

	it('Returns 500 when a server error occurs', async () => {
		stub = sinon.stub(DiveSite, 'esSearch');
		stub.rejects('nope');

		const { body } = await request(App)
			.get('/diveSites')
			.query({ query: 'fresh water' })
			.expect(500);

		expect(body.status).to.equal(500);
		expect(body.errorId).to.equal(ErrorIds.serverError);
		expect(body.logId).to.exist;
	});
});
