import { badRequest, forbidden, notFound, serverError } from '../utils/error-response';
import DiveSite from '../data/sites';
import { DiveSiteSchema, DiveSiteSearchSchema } from '../validation/site';
import Joi from 'joi';

const DiveSiteCollectionSchema = Joi
	.array()
	.items(DiveSiteSchema)
	.min(1)
	.max(250);

function buildMongoQuery(query) {
	const {
		skip,
		sortOrder,
		count
	} = query;
	const parameters = {};

	return DiveSite
		.find(parameters)
		.sort(`${ sortOrder === 'desc' ? '-' : '' }name`)
		.skip(skip ? parseInt(skip, 10) : 0)
		.limit(count ? parseInt(count, 10) : 500);
}

// Skip ElasticSearch and go straight to MongoDB...
export async function listSites(req, res, next) {
	const {
		query,
		closeTo,
		distance
	} = req.query;
	const { error } = Joi.validate(req.query, DiveSiteSearchSchema);

	if (error) {
		return badRequest(
			'Unable to process request. There was a problem with the query string. See details.',
			error,
			res
		);
	}

	// For complex searches defer to ElasticSearch
	if (query || closeTo || distance) {
		return next();
	}

	try {
		const results = await buildMongoQuery(req.query).exec();
		res.json(results.map(r => r.toCleanJSON()));
	} catch (err) {
		const logId = req.logError('Failed to query database.', err);
		serverError(res, logId);
	}
}

// Query ElasticSearch for more robust searching...
/* eslint-disable camelcase */
export async function searchSites(req, res) {
	const esQuery = {
		query: {
			bool: {
				must: {}
			}
		},
		from: req.query.skip ? parseInt(req.query.skip, 10) : 0,
		size: req.query.count ? parseInt(req.query.count, 10) : 500
	};

	if (req.query.query) {
		esQuery.query.bool.must.multi_match = {
			query: req.query.query,
			fields: [
				'name^3',
				'location',
				'country',
				'description^1',
				'tags^5'
			],
			fuzziness: 'AUTO'
		};
	} else {
		esQuery.query.bool.must.match_all = {};
	}

	if (req.query.closeTo) {
		const [ lon, lat ] = req.query.closeTo;
		esQuery.query.bool.filter = {
			geo_distance: {
				distance: `${ req.query.distance || '50' }km`,
				gps: {
					lat,
					lon
				}
			}
		};
	}

	try {
		const results = await DiveSite.searchAsync(esQuery);
		res.json(results.body.hits.hits.map(r => ({
			siteId: r._id,
			score: r._score,
			...r._source
		})));
	} catch (err) {
		const logId = req.logError('Failed to search dive sites', err);
		serverError(res, logId);
	}
}
/* eslint-enable camelcase */

export function getSite(req, res) {
	res.json(req.diveSite.toCleanJSON());
}

export async function createSites(req, res) {
	const { error } = Joi.validate(req.body, DiveSiteCollectionSchema);
	if (error) {
		return badRequest(
			'Unable to create dive sites. There was a problem validating the request body. See details.',
			error,
			res
		);
	}

	try {
		const diveSites = req.body.map(s => {
			const site = new DiveSite();
			site.assign(s);
			site.owner = req.user.username;
			return site;
		});

		await DiveSite.insertMany(diveSites);
		res.json(diveSites.map(s => s.toCleanJSON()));
	} catch (err) {
		const logId = req.logError('Failed to create dive sites', err);
		serverError(res, logId);
	}
}

export async function updateSite(req, res) {
	const { error } = Joi.validate(req.body, DiveSiteSchema);
	if (error) {
		return badRequest(
			'Could not update site. There was a problem with the data submitted.',
			error,
			res
		);
	}

	try {
		req.diveSite.assign(req.body);
		await req.diveSite.save();
		res.sendStatus(204);
	} catch (err) {
		const logId = req.logError('Failed to update dive site info', err);
		serverError(res, logId);
	}
}

export async function deleteSite(req, res) {
	try {
		await DiveSite.findByIdAndDelete(req.diveSite.id);
		res.sendStatus(204);
	} catch (err) {
		const logId = req.logError('Failed to delete dive site entry', err);
		serverError(res, logId);
	}
}

export async function loadDiveSite(req, res, next) {
	try {
		const site = await DiveSite.findById(req.params.siteId);
		if (!site) {
			return notFound(req, res);
		}

		req.diveSite = site;
		return next();
	} catch (err) {
		const logId = req.logError('Failed to retrieve dive site info', err);
		return serverError(res, logId);
	}
}

export function assertWriteAccess(req, res, next) {
	if (req.diveSite.owner === req.user.username || req.user.role === 'admin') {
		return next();
	}

	forbidden(res, 'User does not have permission to modify or delete this dive site entry.');
}
