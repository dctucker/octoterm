#!/usr/bin/env node
'use strict';

const blessed = require('blessed')
const Agenda = require('./Agenda')
const AgendaView = require('./AgendaView')


// main
var model = new Agenda

// Create a screen object.
var program = blessed.program()
var screen = blessed.screen({
	program: program,
	fullUnicode: true,
	smartCSR: true
});


var view = new AgendaView(screen, model)

var cmdline = blessed.textbox({
	parent: screen,
	top: '100%-2',
	height: 1,
	left: 0,
	right: 0,
	bg: 'black'
})

var statusbar = blessed.text({
	top: '100%-1',
	width: '100%',
	left: 0,
	height: 1,
	tags: true,
	content:
		` {bold}{inverse} o {/} Open   `+
		` {bold}{inverse} m {/} Mute   `+
		` {bold}{inverse} x {/} Select `+
		` {bold}{inverse} / {/} Search `+
		` {bold}{inverse} r {/} Reload `+
		` {bold}{inverse} q {/} Quit   `
})

var search = () => {
	screen.saveFocus()
	cmdline.focus()
	cmdline.setValue("/")
	cmdline.readInput((err, data) => {
		if (err) return
		if( data === null ){
			cmdline.setValue('')
			data = ""
		} else {
			data = data.substr(1)
		}
		model.search_phrase = data
		model.linearize()
		view.list.setData( view.reduceView() )
		view.list.focus()
		return screen.render()
	});
	return screen.render()
}

var filter = () => {
}

var bar = blessed.listbar({
	//parent: screen,
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
		'Column': {
			keys: ['tab'],
			callback: () => view.moveColumn(1),
		},
		'Select':{
			keys: ['x','space'],
			callback: () => view.toggleSelection(),
		},
		'Filter': {
			keys: ['f'],
			callback: () => filter(),
		},
		'Search': {
			keys: ['/'],
			callback: () => search(),
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
});

screen.key(['C-c'], (ch, key) => {
	return screen.destroy()
})

screen.append(view.list)
screen.append(bar)
screen.append(cmdline)
screen.append(view.loader)

screen.title = 'my window title';

view.reload()
