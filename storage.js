const defaults = require('./defaults')
const nls = require('node-localstorage')

const storage = new nls.LocalStorage('./storage')

const merge = (current, update) => {
	if (update == null){
		return current;
	}
	Object.keys(update).forEach(key => {
		// if update[key] exist, and it's not a string or array,
		// we go in one level deeper
		if (current.hasOwnProperty(key) && typeof current[key] === 'object' && !(current[key] instanceof Array)) {
			merge(current[key], update[key]);

			// if update[key] doesn't exist in current, or it's a string
			// or array, then assign/overwrite current[key] to update[key]
		} else {
			current[key] = update[key];
		}
	});
	return current;
}

module.exports = {
	storage,
	getItem: (key) => {
		let ret = storage.getItem(`${key}.json`)
		return merge(defaults[key], JSON.parse(ret))
	},
	setItem: (key, value) => {
		return storage.setItem(`${key}.json`, JSON.stringify(value, null, "\t"))
	},
}
