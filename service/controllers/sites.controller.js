/* eslint camelcase: 0 */

import { badRequest, forbidden, notFound, serverError } from '../utils/error-response';
import DiveSite from '../data/sites';
import DiveSiteRating from '../data/site-ratings';
import {
	DiveSiteSchema,
	DiveSiteCollectionSchema,
	DiveSiteRatingSchema,
	DiveSiteSearchSchema,
	ListDiveSiteRatingsSchema
} from '../validation/site';
import Joi from 'joi';
import moment from 'moment';

async function getAverageRating(diveSiteId) {
	const result = await DiveSiteRating.aggregate([
		{
			$match: { diveSite: diveSiteId }
		},
		{
			$group: {
				_id: null,
				avgRating: { $avg: '$rating' }
			}
		},
		{
			$project: {
				_id: 0,
				avgRating: 1
			}
		}
	]);

	return result && result[0] ? result[0].avgRating : null;
}

function addSearchTerm(esQuery, searchTerm) {
	if (searchTerm) {
		esQuery.query.bool.must.multi_match = {
			query: searchTerm,
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
}

function addFilter(esQuery, filter) {
	if (!esQuery.query.bool.filter) {
		esQuery.query.bool.filter = {
			bool: {
				must: []
			}
		};
	}

	esQuery.query.bool.filter.bool.must.push(filter);
}

function addSorting(esQuery, sortBy, sortOrder) {
	if (sortBy) {
		switch (sortBy) {
		case 'difficulty':
			esQuery.sort = {
				difficulty: { order: sortOrder || 'asc' }
			};
			break;

		case 'rating':
			esQuery.sort = {
				avgRating: { order: sortOrder || 'asc' }
			};
			break;

		default:
		}

	}
}

/* eslint-disable complexity */
export async function searchSites(req, res) {
	const { error } = Joi.validate(req.query, DiveSiteSearchSchema);
	if (error) {
		return badRequest(
			'Unable to complete search because there was a problem with the query string.',
			error,
			res
		);
	}

	const esQuery = {
		query: {
			bool: {
				must: {}
			}
		}
	};

	try {
		esQuery.size = req.query.count
			? parseInt(req.query.count, 10)
			: 500;

		if (req.query.skip) {
			esQuery.from = parseInt(req.query.skip, 10);
		}

		addSearchTerm(esQuery, req.query.query);

		if (req.query.owner) {
			addFilter(esQuery, {
				term: {
					owner: req.query.owner
				}
			});
		}

		if (req.query.water) {
			addFilter(esQuery, {
				term: {
					water: req.query.water
				}
			});
		}

		if (req.query.accessibility) {
			addFilter(esQuery, {
				term: {
					accessibility: req.query.accessibility
				}
			});
		}

		if (req.query.avoidEntryFee) {
			addFilter(esQuery, {
				term: {
					entryFee: false
				}
			});
		}

		if (req.query.maxDifficulty) {
			addFilter(esQuery, {
				range: {
					difficulty: { lte: req.query.maxDifficulty }
				}
			});
		}

		if (req.query.minRating) {
			addFilter(esQuery, {
				range: {
					avgRating: { gte: req.query.minRating }
				}
			});
		}

		if (req.query.closeTo) {
			const [ lon, lat ] = req.query.closeTo;
			addFilter(esQuery, {
				geo_distance: {
					distance: `${ req.query.distance || '50' }km`,
					gps: {
						lat,
						lon
					}
				}
			});
		}

		addSorting(esQuery, req.query.sortBy, req.query.sortOrder);

		const results = await DiveSite.esSearch(esQuery);
		res.json(results.body.hits.hits.map(hit => {
			const site = {
				siteId: hit._id,
				...hit._source,
				score: hit._score
			};

			if (site.gps) {
				site.gps = {
					lon: site.gps[0],
					lat: site.gps[1]
				};
			}

			return site;
		}));
	} catch (err) {
		const logId = req.logError('Failed to search dive sites', err);
		serverError(res, logId);
	}
}
/* eslint-enable complexity */

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

export async function listSiteRatings(req, res) {
	const { error } = Joi.validate(req.query, ListDiveSiteRatingsSchema);
	if (error) {
		return badRequest(
			'Could not complete request. There was a problem with the query string.',
			error,
			res
		);
	}

	try {
		const sortOrder = `${ req.query.sortOrder === 'asc' ? '' : '-' }${ req.query.sortBy || 'date' }`;
		const ratings = await DiveSiteRating
			.find({ diveSite: req.diveSite.id })
			.sort(sortOrder)
			.skip(req.query.skip ? parseInt(req.query.skip, 10) : 0)
			.limit(req.query.count ? parseInt(req.query.count, 10) : 200)
			.exec();
		res.json(ratings.map(rating => rating.toCleanJSON()));
	} catch (err) {
		const logId = req.logError('Failed to query for dive site ratings', err);
		serverError(res, logId);
	}
}

export function getSiteRating(req, res) {
	res.json(req.diveSiteRating.toCleanJSON());
}

export async function addSiteRating(req, res) {
	const { error } = Joi.validate(req.body, DiveSiteRatingSchema);
	if (error) {
		return badRequest(
			'Unable to post the site rating because the request body was invalid.',
			error,
			res
		);
	}

	try {
		const rating = new DiveSiteRating({
			...req.body,
			user: req.user.username,
			date: moment().utc().toDate(),
			diveSite: req.diveSite.id
		});

		await rating.save();
		req.diveSite.avgRating = await getAverageRating(req.diveSite._id);
		await req.diveSite.save();

		res.json(rating.toCleanJSON());
	} catch (err) {
		const logId = req.logError('Failed to create new dive site rating.', err);
		serverError(res, logId);
	}
}

export async function updateSiteRating(req, res) {
	const { error } = Joi.validate(req.body, DiveSiteRatingSchema);
	if (error) {
		return badRequest(
			'Unable to update dive site rating. There was a problem in the request body.',
			error,
			res
		);
	}

	try {
		req.diveSiteRating.assign(req.body);

		await req.diveSiteRating.save();
		req.diveSite.avgRating = await getAverageRating(req.diveSite._id);
		await req.diveSite.save();

		res.sendStatus(204);
	} catch (err) {
		const logId = req.logError(`Failed to update dive site rating ${ req.params.ratingId }.`, err);
		serverError(res, logId);
	}
}

export async function deleteSiteRating(req, res) {
	try {

		await req.diveSiteRating.remove();
		req.diveSite.avgRating = await getAverageRating(req.diveSite._id);
		await req.diveSite.save();

		res.sendStatus(204);
	} catch (err) {
		const logId = req.logError(`Failed to delete dive site rating ${ req.params.ratingId }.`, err);
		serverError(res, logId);
	}
}

export async function loadDiveSite(req, res, next) {
	try {
		req.diveSite = await DiveSite.findById(req.params.siteId);
		if (!req.diveSite) {
			return notFound(req, res);
		}

		return next();
	} catch (err) {
		const logId = req.logError('Failed to retrieve dive site info', err);
		return serverError(res, logId);
	}
}

export async function loadRating(req, res, next) {
	try {
		req.diveSiteRating = await DiveSiteRating.findOne({
			_id: req.params.ratingId,
			diveSite: req.params.siteId
		});

		if (!req.diveSiteRating) {
			return notFound(req, res);
		}

		return next();
	} catch (err) {
		const logId = req.logError(`Failed to retrieve dive site rating ${ req.params.ratingId }.`, err);
		return serverError(res, logId);
	}
}

export function assertSiteWriteAccess(req, res, next) {
	if (req.diveSite.owner === req.user.username || req.user.role === 'admin') {
		return next();
	}

	return forbidden(res, 'User does not have permission to modify or delete this dive site entry.');
}

export function assertRatingWriteAccess(req, res, next) {
	if (req.diveSiteRating.user === req.user.username || req.user.role === 'admin') {
		return next();
	}

	return forbidden(res, 'User does not have permission to modify or delete this dive site rating.');
}
