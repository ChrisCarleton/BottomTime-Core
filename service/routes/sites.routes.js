import {
	assertWriteAccess,
	createOrUpdateSites,
	deleteSite,
	getSite,
	listSites,
	loadDiveSite,
	updateSite
} from '../controllers/sites.controller';
import { RequireUser } from '../controllers/security.controller';

module.exports = app => {
	app.route('/diveSites')
		.get(listSites)
		.post(createOrUpdateSites);
	app.route('/diveSites/:siteId([a-f0-9]{24})')
		.get(loadDiveSite, getSite)
		.put(updateSite)
		.delete(RequireUser, loadDiveSite, assertWriteAccess, deleteSite);
};
