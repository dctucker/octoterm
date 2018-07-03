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
	if(view.filters.length > 0){
		view.filters = []
		view.invalidate()
		return
	}
	const column_name = Object.entries(view.columns)[view.currentColumn][0]
	const [r,n] = view.getUnderCursor()
	const cell_value = view.model.node(r,n)[column_name]
	view.filters = [([repo_id, n_id]) => {
		return view.model.node(repo_id, n_id)[column_name] === cell_value
	}]
	view.invalidate()
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
