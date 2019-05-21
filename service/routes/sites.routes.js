import {
	createOrUpdateSites,
	deleteSite,
	getSite,
	listSites,
	updateSite
} from '../controllers/sites.controller';

module.exports = app => {
	app.route('/diveSites')
		.get(listSites)
		.post(createOrUpdateSites);
	app.route('/diveSites/:siteId([a-f0-9]{24})')
		.get(getSite)
		.put(updateSite)
		.delete(deleteSite);
};
