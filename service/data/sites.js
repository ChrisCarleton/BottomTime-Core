/* eslint camelcase: 0 */

import _ from 'lodash';
import config from '../config';
import log from '../logger';
import mongoose from './database';
import mongoosastic from 'mongoosastic';
import search from '../search';

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
		geo_point: {
			type: String,
			es_type: 'geo_point',
			es_indexed: true
		},
		lat: Number,
		lon: Number
	}
});

siteSchema.plugin(mongoosastic, {
	index: config.elasticSearchIndex,
	esClient: search
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
			lon: this.gps.lon,
			lat: this.gps.lat
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
	this.gps = entity.gps;
};

siteSchema.statics.searchAsync = function (query) {
	return new Promise((resolve, reject) => {
		this.esSearch(query, { hydrate: false }, (err, results) => {
			if (err) {
				reject(err);
			} else {
				resolve(results.body.hits.hits.map(r => ({
					siteId: r._id,
					score: r._score,
					...r._source
				})));
			}
		});
	});
};

const model = mongoose.model('Site', siteSchema);
model.createMapping((err, mapping) => {
	const message = 'Mapping dive sites data to ElasticSearch:';
	if (err) {
		log.warn(message, JSON.stringify(err, null, '  '));
	} else {
		log.debug(message, mapping);
	}
});

export default model;
