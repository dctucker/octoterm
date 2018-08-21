const moment = require('moment')

const getContrastColor = (color) => {
	let r = parseInt(color.substr(0,2), 16)
	let g = parseInt(color.substr(2,2), 16)
	let b = parseInt(color.substr(4,2), 16)
	let a = 1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return a < 0.5 ? 'black' : 'white'
}

const renderLabels = (labels) => {
	return labels.map((label) => {
		let fg = getContrastColor(label.color)
		return `{${fg}-fg}{#${label.color}-bg}${label.name}{/}`
	}).join(' ')
}

const escape = (str) => {
	return str.replace(/[{}]/g, function(ch) {
		return ch === '{' ? '｛' : '｝';
	});
}

const dateFormat = (d) => {
	return moment(d).fromNow()
}

/* // not yet used, will use for chunking notification loads via graphql
Object.defineProperty(Array.prototype, 'chunk', {
    value: function(chunkSize) {
        var that = this
        return Array(Math.ceil(that.length/chunkSize)).fill().map(function(_,i){
            return that.slice(i*chunkSize,i*chunkSize+chunkSize)
        })
    }
})
*/

module.exports = {
	foreach: (object, func) => {
		for( const [ key, value ] of Object.entries(object) ){
			func(key, value)
		}
	},
	getContrastColor,
	renderLabels,
	dateFormat,
	escape,
}
