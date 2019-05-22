/* eslint camelcase: 0 */

import _ from 'lodash';
import config from '../config';
import mongoose from './database';
import mesxp from 'mongoose-elasticsearch-xp';
import search from '../search';

const siteSchema = mongoose.Schema({
	name: {
		type: String,
		required: true,
		index: true,
		es_indexed: true
	},
	owner: {
		type: String,
		required: true,
		index: true
	},
	location: {
		type: String,
		es_indexed: true
	},
	country: {
		type: String,
		required: true,
		es_indexed: true
	},
	description: {
		type: String,
		es_indexed: true
	},
	tags: {
		type: [ String ],
		es_indexed: true
	},
	gps: {
		type: [ Number ],
		index: '2dsphere',
		es_indexed: true,
		es_type: 'geo-point'
	}
});

siteSchema.plugin(mesxp, {
	index: config.elasticSearchIndex,
	client: search
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
