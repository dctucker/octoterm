#!/usr/bin/env node
'use strict';

const blessed = require('blessed')
const Agenda = require('./Agenda')
const AgendaView = require('./AgendaView')
const Bar = require('./Bar')

// main
var program = blessed.program()
var screen = blessed.screen({
	program: program,
	fullUnicode: true,
	smartCSR: true
});
screen.key(['C-c'], (ch, key) => {
	return screen.destroy()
})

var model = new Agenda
var view = new AgendaView(screen, model)
var bar = Bar({view, screen})

screen.append(bar)
screen.append(view.list)
screen.append(view.cmdline)
screen.append(view.loader)

screen.title = 'Octoterm';

view.reload()
