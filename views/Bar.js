const blessed = require('blessed')
const store = require('../components/storage')

const { keymap } = store.getItem('options')

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
	starCurrent: 'Star',
	addColumn: 'Columns',
	inspect: 'Inspect',
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
			keys: [...key],
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
					bg: '#3f3f7f',
				},
			},
			selected: {
				bg: 'black',
			},
		},
		commands
	})
}
