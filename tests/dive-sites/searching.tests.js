import { App } from '../../service/server';
import DiveSite from '../../service/data/sites';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import fakeDiveSite, { toDiveSite } from '../util/fake-dive-site';
import faker from 'faker';
import { getDistance } from 'geolib';
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
			fakes[i] = fakeDiveSite();
			fakes[i].gps = toGps(faker.random.arrayElement([
				faker.random.arrayElement(CozumelDiveSites),
				faker.random.arrayElement(RoatanDiveSites)
			]));
			diveSites[i] = toDiveSite(fakes[i]);
		}

		await DiveSite.deleteMany({});
		await DiveSite.insertMany(diveSites);
	});

	afterEach(() => {
		if (stub) {
			stub.restore();
			stub = null;
		}
	});

	after(async () => {
		await DiveSite.deleteMany({});
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

	it('Geo searches work', async () => {
		const { body } = await request(App)
			.get('/diveSites')
			.query({
				closeTo: SanMiguelDeCozumel,
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
				closeTo: SanMiguelDeCozumel,
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
				closeTo: SanMiguelDeCozumel,
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
		expect(first[first.length - 1].score).to.be.at.least(second[0].score);
	});

	it('Returns 500 when a server error occurs', async () => {
		stub = sinon.stub(DiveSite, 'searchAsync');
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
