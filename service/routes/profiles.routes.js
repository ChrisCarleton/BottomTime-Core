import {
	GetProfile,
	UpdateProfile
} from '../controllers/profiles.controller';
import { RetrieveUserAccount } from '../controllers/security.controller';

module.exports = app => {
	app.route('/users/:username/profile')
		.get(RetrieveUserAccount, GetProfile)
		.put(RetrieveUserAccount, UpdateProfile);
};
