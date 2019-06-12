/* eslint camelcase: 0 */

import _ from 'lodash';
import config from '../config';
import mongoose from './database';
import { v6 as mexp } from 'mongoose-elasticsearch-xp';
import search from '../search';

require('./site-ratings');

const siteSchema = mongoose.Schema({
	name: {
		type: String,
		required: true,
		index: true,
		es_type: 'text',
		es_indexed: true
	},
	owner: {
		type: String,
		required: true,
		index: true,
		es_type: 'keyword',
		es_indexed: true
	},
	location: {
		type: String,
		es_indexed: true,
		es_type: 'text'
	},
	country: {
		type: String,
		es_indexed: true,
		es_type: 'text'
	},

	// salt or fresh
	water: {
		type: String,
		es_indexed: true,
		es_type: 'keyword'
	},

	// shore or boat
	accessibility: {
		type: String,
		es_indexed: true,
		es_type: 'keyword'
	},
	entryFee: {
		type: Boolean,
		es_indexed: true,
		es_type: 'boolean'
	},
	difficulty: {
		type: Number,
		es_indexed: true,
		es_type: 'float'
	},
	description: {
		type: String,
		es_indexed: true,
		es_type: 'text'
	},
	tags: {
		type: [ String ],
		es_type: 'text',
		es_indexed: true
	},
	gps: {
		type: [ Number ],
		es_type: 'geo_point',
		es_indexed: true
	},
	avgRating: {
		type: Number,
		es_type: 'float',
		es_indexed: true
	}
});

siteSchema.plugin(mexp, {
	index: `${ config.elasticSearchIndex }_sites`,
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
			'water',
			'accessibility',
			'entryFee',
			'difficulty',
			'description',
			'tags',
			'avgRating'
		])
	};

	if (this.gps) {
		clean.gps = {
			lon: this.gps[0],
			lat: this.gps[1]
		};
	}

	return clean;
};

siteSchema.methods.assign = function (entity) {
	this.name = entity.name;
	this.location = entity.location;
	this.country = entity.country;
	this.water = entity.water;
	this.accessibility = entity.accessibility;
	this.entryFee = entity.entryFee;
	this.difficulty = entity.difficulty;
	this.description = entity.description;
	this.tags = entity.tags;

	if (entity.gps) {
		this.gps = [
			entity.gps.lon,
			entity.gps.lat
		];
	} else if (entity.gps === null) {
		this.gps = null;
	}
};

const model = mongoose.model('Site', siteSchema);
export default model;
module.exports = model;
