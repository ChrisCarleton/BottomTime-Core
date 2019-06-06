/* eslint camelcase: 0 */

import _ from 'lodash';
import config from '../config';
import log from '../logger';
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
	ratings: {
		type: [ mongoose.SchemaTypes.ObjectId ],
		ref: 'SiteRating',
		es_indexed: true,
		es_type: {
			user: {
				es_type: 'keyword'
			},
			date: {
				es_type: 'date'
			},
			rating: {
				es_type: 'float'
			},
			comments: {
				es_type: 'text'
			}
		}
	}
});

siteSchema.plugin(mexp, {
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
			'water',
			'accessibility',
			'entryFee',
			'difficulty',
			'description',
			'tags'
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

const message = 'Mapping dive sites data to ElasticSearch:';
model.esCreateMapping()
	.then(mapping => {
		log.debug(message, mapping);
	})
	.catch(err => {
		log.warn(message, JSON.stringify(err, null, '  '));
	});

export default model;
