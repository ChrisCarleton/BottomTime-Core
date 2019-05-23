import { forbidden, notFound, serverError } from '../utils/error-response';
import DiveSite from '../data/sites';

export function listSites(req, res) {
	res.sendStatus(501);
}

export function getSite(req, res) {
	res.json(req.diveSite.toCleanJSON());
}

export function createOrUpdateSites(req, res) {
	res.sendStatus(501);
}

export function updateSite(req, res) {
	res.sendStatus(501);
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
