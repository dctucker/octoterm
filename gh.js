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

var updateCmdline = () => {
	cmdline.setValue([
		model.filters.columnFilter ? model.filters.columnFilter.description : "",
		model.filters.search ? model.filters.search.description : "",
	].join(''))
}

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
		model.search(''+data)
		model.linearize()
		view.invalidate()
		view.list.focus()
		updateCmdline()
		return screen.render()
	});
	return screen.render()
}

var columnFilter = () => {
	const [r,n] = view.getUnderCursor()
	let column_name = "", cell_value = ""
	if( model.filters.columnFilter === undefined ){
		column_name = Object.entries(view.columns)[view.currentColumn][0]
		cell_value = '' + view.model.node(r,n)[column_name]
	}
	model.columnFilter(column_name, cell_value)
	model.linearize()
	view.invalidate()
	view.moveCursorOver(r,n)
	updateCmdline()
	return screen.render()
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
		'Select':{
			keys: ['x','space'],
			callback: () => view.toggleSelection(),
		},
		'Filter': {
			keys: ['f'],
			callback: () => columnFilter(),
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
