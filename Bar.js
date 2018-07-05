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
			'Select':{
				keys: ['x','space'],
				callback: () => view.toggleSelection(),
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
			'Quit': {
				keys: ['q'],
				callback: () => screen.destroy(),
			},
		}
	})
)
