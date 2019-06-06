import {
	addSiteRating,
	assertWriteAccess,
	createSites,
	deleteSite,
	deleteSiteRating,
	getSite,
	getSiteRating,
	listSiteRatings,
	loadDiveSite,
	loadRating,
	searchSites,
	updateSite,
	updateSiteRating
} from '../controllers/sites.controller';
import { RequireUser } from '../controllers/security.controller';

const SitesRoute = '/diveSites';
const SiteRoute = `${ SitesRoute }/:siteId([a-f0-9]{24})`;
const RatingsRoute = `${ SiteRoute }/ratings`;
const RatingRoute = `${ RatingsRoute }/:ratingId([a-f0-9]{24})`;

module.exports = app => {
	app.route(SitesRoute)
		.get(searchSites)
		.post(RequireUser, createSites);
	app.route(SiteRoute)
		.get(loadDiveSite, getSite)
		.put(RequireUser, loadDiveSite, assertWriteAccess, updateSite)
		.delete(RequireUser, loadDiveSite, assertWriteAccess, deleteSite);
	app.route(RatingsRoute)
		.get(loadDiveSite, listSiteRatings)
		.post(RequireUser, loadDiveSite, addSiteRating);
	app.route(RatingRoute)
		.get(loadRating, getSiteRating)
		.put(updateSiteRating)
		.delete(deleteSiteRating);
};
