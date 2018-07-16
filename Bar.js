const blessed = require('blessed')

module.exports = ({screen, view}) => (
	blessed.listbar({
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
		commands: {
			'Open': {
				keys: ['o'],
				callback: () => view.openSelection(),
			},
			'Mute': {
				keys: ['m'],
				callback: () => view.muteSelection(),
			},
			'Filter': {
				keys: ['f'],
				callback: () => view.columnFilter(),
			},
			'Search': {
				keys: ['/'],
				callback: () => view.search(),
			},
			'Reload': {
				keys: ['r'],
				callback: () => view.reload(),
			},
			'Select':{
				keys: ['x','space'],
				callback: () => view.toggleSelection(),
			},
			'All': {
				keys: ['+'],
				callback: () => view.selectAll(),
			},
			'None': {
				keys: ['-'],
				callback: () => view.deselectAll(),
			},
			'Toggle': {
				keys: ['*'],
				callback: () => view.toggleSelectAll(),
			},
			'Star': {
				keys: ['s'],
				callback: () => view.starCurrent(),
			},
			'Quit': {
				keys: ['q'],
				callback: () => screen.destroy(),
			},
		}
	})
)
