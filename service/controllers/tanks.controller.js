import { badRequest, conflict, forbidden, notFound, serverError } from '../utils/error-response';
import Joi from 'joi';
import Tank from '../data/tanks';
import { TankProfileSchema } from '../validation/tank';
import tankProperties from '../utils/tank-properties';

const DefaultTanks = Object.keys(tankProperties).map(name => ({
	name,
	...tankProperties[name]
}));

export async function GetTanks(req, res) {
	try {
		if (req.user) {
			const userTanks = await Tank
				.find({ userId: req.user.id })
				.sort('name')
				.exec();

			let defaultTanks = { ...tankProperties };
			userTanks.forEach(t => {
				delete defaultTanks[t.name];
			});
			defaultTanks = Object.keys(defaultTanks).map(name => ({
				name,
				...tankProperties[name]
			}));

			res.json(userTanks.map(t => t.toCleanJSON()).concat(defaultTanks));
		} else {
			res.json(DefaultTanks);
		}
	} catch (err) {
		const logId = req.logError('Failed to retrieve custom tank profiles for user', err);
		serverError(res, logId);
	}
}

export async function CreateTank(req, res) {
	const { error } = Joi.validate(req.body, TankProfileSchema);
	if (error) {
		return badRequest(
			'Tank profile information was invalid',
			error,
			res
		);
	}

	try {
		const [ tankProfileCount, existingTank ] = await Promise.all([
			Tank.find({ userId: req.user.id }).estimatedDocumentCount(),
			Tank.findOne({ userId: req.user.id, name: req.body.name })
		]);

		if (tankProfileCount >= 50) {
			return forbidden(res, 'Limit of 50 custom tank profiles has been reached.');
		}

		if (existingTank) {
			return conflict(res, 'name', 'Tank name is already taken.');
		}

		const tank = new Tank({
			...req.body,
			userId: req.user.id
		});
		await tank.save();
		res.json(tank.toCleanJSON());
	} catch (err) {
		const logId = req.logError('Unable to save new tank profile', err);
		serverError(res, logId);
	}
}

export async function UpdateTank(req, res) {
	const { error } = Joi.validate(req.body, TankProfileSchema);
	if (error) {
		return badRequest(
			'Tank profile information was invalid',
			error,
			res
		);
	}

	try {
		const [ tank, conflictingTank ] = await Promise.all([
			Tank.findOne({
				_id: req.params.tankId,
				userId: req.user.id
			}),
			Tank.findOne({
				_id: { $ne: req.params.tankId },
				userId: req.user.id,
				name: req.body.name
			})
		]);

		if (!tank) {
			return notFound(req, res);
		}

		if (conflictingTank) {
			return conflict(
				res,
				'name',
				`Cannot rename the tank because a tank profile already exists with the name "${ req.body.name }".`
			);
		}

		tank.assign(req.body);
		await tank.save();

		res.sendStatus(204);
	} catch (err) {
		const logId = req.logError('Unable to update tank profile', err);
		serverError(res, logId);
	}
}

export async function DeleteTank(req, res) {
	try {
		const tank = await Tank.findOneAndDelete({
			_id: req.params.tankId,
			userId: req.user._id
		});

		if (!tank) {
			return notFound(req, res);
		}

		res.sendStatus(204);
	} catch (err) {
		const logId = req.logError('Unable to find or delete tank profile', err);
		serverError(res, logId);
	}
}
