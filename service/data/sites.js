import _ from 'lodash';
import mongoose from './database';

const siteSchema = mongoose.Schema({
	name: {
		type: String,
		required: true,
		index: true
	},
	owner: {
		type: String,
		required: true,
		index: true
	},
	location: {
		type: String,
		required: true,
		index: true
	},
	country: {
		type: String,
		required: true,
		index: true
	},
	description: String,
	tags: [ String ],
	gps: {
		type: [ Number ],
		index: '2dsphere'
	}
});

siteSchema.methods.toCleanJSON = function () {
	const clean = {
		siteId: this.id,
		..._.pick(this, [
			'name',
			'owner',
			'location',
			'country',
			'description'
		])
	};

	if (this.gps && this.gps.coordinates) {
		clean.gps = {
			longitude: this.gps.coordinates[0],
			latitude: this.gps.coordinates[1]
		};
	}

	return clean;
};

siteSchema.methods.assign = function (entity) {
	this.name = entity.name;
	this.location = entity.location;
	this.country = entity.country;
	this.description = entity.description;

	if (entity.gps && entity.gps.latitude && entity.gps.longitude) {
		if (this.gps) {
			this.gps.coordinates = [
				entity.gps.longitude,
				entity.gps.latitude
			];
		} else {
			this.gps = {
				type: 'Point',
				coordinates: [
					entity.gps.longitude,
					entity.gps.latitude
				]
			};
		}
	}
};

export default mongoose.model('Site', siteSchema);
