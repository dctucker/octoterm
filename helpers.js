
module.exports = {
	foreach: (object, func) => {
		for( const [ key, value ] of Object.entries(object) ){
			func(key, value)
		}
	}
}
