const blessed = require('blessed')

const keymap = {
	openSelection: 'o',
	muteSelection: 'm',
	columnFilter: 'f',
	search: '/',
	reload: 'r',
	toggleSelection: 'x',
	selectAll: '+',
	deselectAll: '-',
	toggleSelectAll: '*',
	star: 's',
	addColumn: 'c',
	quit: 'q',
}

const lang = {
	openSelection: 'Open',
	muteSelection: 'Mute',
	columnFilter: 'Filter',
	search: 'Search',
	reload: 'Reload',
	toggleSelection: 'Select',
	selectAll: 'All',
	deselectAll: 'None',
	toggleSelectAll: 'Toggle',
	star: 'Star',
	addColumn: 'Columns',
	quit: 'Quit',
}

module.exports = ({screen, view}) => {
	const commands = {}
	for( const func in keymap ){
		if( typeof view[func] !== 'function' ){
			continue
		}
		const key = keymap[func]
		commands[lang[func]] = {
			keys: [key],
			callback: () => view[func]()
		}
	}
	return blessed.listbar({
		bottom: 0,
		left: 1,
		right: 1,
		height: 1,
		mouse: true,
		keys: true,
		style: {
			bg: 'black',
			item: {
				hover: {
					bg: 'blue',
				},
			},
			selected: {
				bg: 'black',
			},
		},
		commands
	})
}
