import { badRequest, serverError } from '../utils/error-response';
import LogEntry from '../data/log-entry';
import moment from 'moment';
import { UpdateProfileSchema } from '../validation/profile';

export async function GetProfile(req, res) {
	try {
		/* eslint-disable no-underscore-dangle */
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
		/* eslint-enable no-underscore-dangle */

		const { bottomTimeLogged, divesLogged }
			= logData.length > 0
				? logData[0]
				: { bottomTimeLogged: 0, divesLogged: 0 };

		res.json({
			...req.account.getProfileJSON(),
			bottomTimeLogged,
			divesLogged,
			readOnly: req.readOnlyResource
		});
	} catch (err) {
		const logId = req.logError('Failed to retrieve profile information.', err);
		serverError(res, logId);
	}
}

export async function UpdateProfile(req, res) {
	try {
		delete req.body.memberSince;
		delete req.body.divesLogged;
		delete req.body.bottomTimeLogged;
		delete req.body.readOnly;

		const isValid = UpdateProfileSchema.validate(req.body);
		if (isValid.error) {
			return badRequest(
				'Unable to update profile information because validation failed',
				isValid.error,
				res);
		}

		Object.assign(req.account, req.body);
		if (typeof (req.body.birthdate) !== 'undefined') {
			Object.assign(
				req.account,
				{
					birthdate: req.body.birthdate
						? moment(req.body.birthdate, 'YYYY-MM-DD').toDate()
						: null
				}
			);
		}

		await req.account.save();
		res.sendStatus(204);
	} catch (err) {
		const logId = req.logError('Unable to update user profile', err);
		serverError(res, logId);
	}
}
