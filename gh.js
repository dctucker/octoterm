#!/usr/bin/env node
'use strict';

// setup logging to file
require('./components/logging')

// require application components
const blessed = require('blessed')
const Agenda = require('./models/Agenda')
const AgendaView = require('./views/AgendaView')
const Bar = require('./views/Bar')

// main
var program = blessed.program()
var screen = blessed.screen({
	program: program,
	fullUnicode: true,
	smartCSR: true,
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

view.reload(true)
