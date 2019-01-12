import {
	GetProfile,
	UpdateProfile
} from '../controllers/profiles.controller';

module.exports = app => {
	app.route('/users/:username/profile')
		.get(GetProfile)
		.put(UpdateProfile);
};
