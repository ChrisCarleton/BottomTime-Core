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
		mappings = mappings || {};
		if (sortBy) {
			const fieldName = mappings[sortBy] || sortBy;
			if (fieldName && fieldName !== 'relevance') {
				esQuery.sort = {};
				esQuery.sort[fieldName] = { order: sortOrder || 'asc' };
			}
		}
	},

	setLimits: (esQuery, skip, count) => {
	    count = count || 500;
		esQuery.size = typeof count === 'string' ? parseInt(count, 10) : count;

		if (skip) {
			esQuery.from = typeof skip === 'string' ? parseInt(skip, 10) : skip;
		}
	},

	selectFields: (esQuery, fields) => {
		esQuery._source = fields;
	}
};
