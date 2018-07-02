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
screen.key(['escape', 'q', 'C-c'], (ch, key) => {
	return screen.destroy()
})


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


screen.append(view.list)
screen.append(statusbar)
screen.append(cmdline)
screen.append(view.loader)

screen.title = 'my window title';
screen.key(['/'], (ch, key) => {
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
})

view.reload()
