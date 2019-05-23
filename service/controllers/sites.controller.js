import { badRequest, forbidden, notFound, serverError } from '../utils/error-response';
import DiveSite from '../data/sites';
import { DiveSiteSchema } from '../validation/site';
import Joi from 'joi';

const DiveSiteCollectionSchema = Joi
	.array()
	.items(DiveSiteSchema)
	.min(1)
	.max(250);

export function listSites(req, res) {
	res.sendStatus(501);
}

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
