/* eslint camelcase: 0 */

export default {
	getBaseQuery: () => ({
		query: {
			bool: {
				must: {}
			}
		}
	}),

	addSearchTerm: (esQuery, searchTerm, fields) => {
		if (searchTerm) {
			esQuery.query.bool.must.multi_match = {
				query: searchTerm,
				fields,
				fuzziness: 'AUTO'
			};
		} else {
			esQuery.query.bool.must.match_all = {};
		}
	},

	addFilter: (esQuery, filter) => {
		if (!esQuery.query.bool.filter) {
			esQuery.query.bool.filter = {
				bool: {
					must: []
				}
			};
		}

		esQuery.query.bool.filter.bool.must.push(filter);
	},

	addSorting: (esQuery, sortBy, sortOrder, mappings) => {
		if (sortBy) {
			const fieldName = mappings[sortBy];
			if (fieldName) {
				esQuery.sort = {};
				esQuery.sort[fieldName] = { order: sortOrder || 'asc' };
			}
		}
	},

	setLimits: (esQuery, skip, count) => {
		esQuery.size = count
			? parseInt(count, 10)
			: 500;

		if (skip) {
			esQuery.from = parseInt(skip, 10);
		}
	},

	selectFields: (esQuery, fields) => {
		esQuery._source = fields;
	}
};
