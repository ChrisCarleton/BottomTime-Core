module.exports = {
	"extends": [
		"strict",
		"strict/mocha"
	],
	"parserOptions": {
		"ecmaVersion": 9,
		"sourceType": "module"
	},
	"env": {
		"node": true,
		"mocha": true
	},
	"rules": {
		"array-element-newline": [2, "consistent"],
		"arrow-parens": [2, "as-needed"],
		"comma-dangle": [2, {
			"arrays": "never",
			"objects": "never",
			"imports": "never",
			"exports": "never",
			"functions": "never"
		}],
		"consistent-return": 0,
		"global-require": 0,
		"id-length": 0,
		"id-match": [2, "^[a-zA-Z_][a-zA-Z0-9_]*$"],
		"indent": [2, "tab"],
		"no-sync": 0,
		"no-tabs": 0,
		"no-unused-expressions": 0,
		"no-warning-comments": 1,
		"operator-linebreak": [2, "before"],
		"prefer-destructuring": [2, {
			"VariableDeclarator": {
				"array": true,
				"object": true
			},
			"AssignmentExpression": {
				"array": false,
				"object": true
			}		
		}]
	}
};
