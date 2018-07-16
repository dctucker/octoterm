const nls = require('node-localstorage')

const storage = new nls.LocalStorage('./storage')

module.exports = {
	storage,
	getItem: (key, defaultValue={}) => {
		let ret = storage.getItem(`${key}.json`)
		if( ret === null ){
			return defaultValue
		}
		return JSON.parse(ret)
	},
	setItem: (key, value) => {
		return storage.setItem(`${key}.json`, JSON.stringify(value, null, "\t"))
	},
}
