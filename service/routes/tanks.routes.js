import {
	CreateTank,
	DeleteTank,
	GetTanks,
	UpdateTank
} from '../controllers/tanks.controller';
import { RequireUser } from '../controllers/security.controller';


module.exports = app => {
	app.route('/tanks')
		.get(GetTanks)
		.post(RequireUser, CreateTank);

	app.route('/tanks/:tankId([a-f0-9]{24})')
		.put(RequireUser, UpdateTank)
		.delete(RequireUser, DeleteTank);
};
