import LogEntry from '../data/log-entry';
import { serverError } from '../utils/error-response';

export async function GetProfile(req, res) {
	/* eslint-disable no-underscore-dangle */
	try {
		const logData = await LogEntry.aggregate([
			{
				$match: {
					userId: req.account._id
				}
			},
			{
				$group: {
					_id: null,
					divesLogged: { $sum: 1 },
					bottomTimeLogged: { $sum: '$bottomTime' }
				}
			},
			{
				$project: {
					_id: 0,
					divesLogged: 1,
					bottomTimeLogged: 1
				}
			}
		]);

		const { bottomTimeLogged, divesLogged }
			= logData.length > 0
				? logData[0]
				: { bottomTimeLogged: 0, divesLogged: 0 };

		res.json({
			...req.account.getProfileJSON(),
			bottomTimeLogged,
			divesLogged
		});
	} catch (err) {
		const logId = req.logError('Failed to retrieve profile information.', err);
		serverError(res, logId);
	}
	/* eslint-enable no-underscore-dangle */
}

export async function UpdateProfile(req, res) {
	await res.sendStatus(503);
}
