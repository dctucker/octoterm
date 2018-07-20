const defaults = require('./defaults')
const nls = require('node-localstorage')

const storage = new nls.LocalStorage('./storage')

module.exports = {
	storage,
	getItem: (key, defaultValue=null) => {
		let ret = storage.getItem(`${key}.json`)
		if( ret === null ){
			if( defaultValue !== null ){
				return defaultValue
			} else {
				return defaults[key]
			}
		}
		return JSON.parse(ret)
	},
	setItem: (key, value) => {
		return storage.setItem(`${key}.json`, JSON.stringify(value, null, "\t"))
	},
}
