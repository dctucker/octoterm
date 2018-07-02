#!/usr/bin/env node
'use strict';

const fetch = require('node-fetch')
const blessed = require('blessed')
const { exec } = require('child_process')

var foreach = (object, func) => {
	for( const [ key, value ] of Object.entries(object) ){
		func(key, value)
	}
}


const auth = { 'Authorization': 'token ' + process.env.GITHUB_TOKEN }
const get_notifications = () => fetch('https://api.github.com/notifications', {
	headers: { ...auth }
}).then(res => res.json())

const graphql = (query) => fetch('https://api.github.com/graphql', {
	body: JSON.stringify({ query: query }),
	method: 'POST',
	headers: { ...auth }
}).then(res => res.json())

const build_agenda = () => {
	return get_notifications().then((json) => {
		let agenda = {}
		json.map((notif) => {
			let repo = notif.repository.name
			let owner = notif.repository.owner.login
			let repo_id = "r" + notif.repository.owner.id + "_" + notif.repository.id
			let url = notif.subject.url
			let typ = notif.subject.type
			typ = typ.charAt(0).toLowerCase() + typ.substr(1)
			let urlparts = url.split('/')
			let number = urlparts[ urlparts.length - 1 ]
			if( notif.subject.latest_comment_url ){
				url = notif.subject.latest_comment_url
			}

			if( typeof agenda[repo_id] === "undefined" ){
				agenda[repo_id] = {
					"owner": owner,
					"repo": repo,
					"nodes": {},
				}
			}

			agenda[repo_id].nodes["i"+number] = {
				"type": typ,
				"number": number,
				"url": url,
				"updated_at": notif.updated_at,
				"reason": notif.reason,
			}
			return notif
		})
		return agenda
	})
}

const build_graphql_query = (agenda) => {
	let q = "{\n"
	foreach(agenda, (repo_id, repo) => {
		q += `${repo_id}: repository(owner: "${repo.owner}", name: "${repo.repo}") {\n`
		foreach(repo.nodes, (key, item) => {
			q += `
				${key}: issueOrPullRequest(number: ${item.number}) {
					__typename
					...issuedata
					...prdata
				}
			`
		})
		q += "\n}\n"
	})
	q += `
	}
	fragment issuedata on Issue {
		url
		title
		number
		closed
		timeline(last:1){
			edges { node { ...timelinedata } }
		}
	}
	fragment prdata on PullRequest {
		url
		title
		number
		state
		labels(first:5){
			edges { node { name } }
		}
		timeline(last:1){
			edges { node { ...timelinedata } }
		}
	}
	fragment timelinedata on Node {
		__typename
		... on UniformResourceLocatable { url }
		... on IssueComment { url }
		... on Commit { url }
		... on Issue { url }
	}
	`
	return q
}

const query_notifications = (q, agenda) => {
	return graphql(q).then((result) => {
		foreach(result.data, (repo_id, repo) => {
			foreach(repo, (key, d) => {
				let state = d["state"] || ( d["closed"] ? "CLOSED" : "OPEN" )
				Object.assign( agenda[repo_id]["nodes"][key], d )
				agenda[repo_id]["nodes"][key]["state"] = state

				if( d.timeline.edges.length > 0 ){
					let node = d.timeline.edges[0].node
					agenda[repo_id].nodes[key].latest = {
						"type": node.__typename,
						"url":  node["url"],
					}
					delete agenda[repo_id].nodes[key].timeline
				}
			})
		})
		return agenda
	})
}

class Agenda {
	constructor(){
		this.tree = {}
		this.notifications = []
		this.selection = []
		this.search_mode = false
		this.search_phrase = ""
	}
	load() {
		return build_agenda()
			.then((agenda) => ({query: build_graphql_query(agenda), agenda}))
			.then(({query, agenda}) => query_notifications(query, agenda))
			.then((tree) => this.tree = tree)
	}
	node(r,k) {
		return this.tree[r].nodes[k]
	}
	linearize() {
		let notifications = []
		foreach( this.tree, (repo_id, repo) => {
			foreach( repo.nodes, (key, d) => {
				if( this.search_phrase === null
				 || this.search_phrase.length === 0
				 || d.title.indexOf(this.search_phrase) >= 0){
					notifications.push([repo_id, key])
				}
			})
		})
		notifications.sort(([r0,k0],[r1,k1]) => {
			return this.node(r1,k1).updated_at.localeCompare( this.node(r0,k0).updated_at )
		})
		this.notifications = notifications
	}
	isSelected(repo_id, key) {
		return this.selection.findIndex(([r,k]) => r == repo_id && k == key ) >= 0
	}
}

var reduceItem = (repo_id, key) => {
	let repo  = model.tree[repo_id]
	let notif = repo.nodes[key]
	let state = notif.state
	if(state === "MERGED"){
		state = "{magenta-bg}MERGED{/}"
	} else if(state === "CLOSED"){
		state = "{red-bg}CLOSED{/}"
	}
	let reason = notif.reason.replace('_',' ')
	let title = notif.title
	if( model.isSelected(repo_id, key) ) {
		title = `{bold}${title}{/}`
	}
	return [
		notif.__typename == "Issue" ? "I" : "PR",
		state,
		reason,
		title,
		notif.updated_at,
	]
}

var reduceView = (model) => {
	let data = model.notifications.map(([repo_id, key]) => {
		return reduceItem(repo_id, key)
	})
	return [['','State','Reason','Title','When'],...data]
}

// main

var model = new Agenda
model.load().then((agenda) => {
	loader.stop()
	model.linearize()
	//console.dir(model.tree, {depth:null})
	//console.log(model.notifications)
	list.setData( reduceView(model) )
	screen.render()
})


// Create a screen object.
var program = blessed.program()
var screen = blessed.screen({
	program: program,
	fullUnicode: true,
	smartCSR: true
});

var list = blessed.listtable({
	parent: screen,
	interactive: true,
	keys: true,
	top: 0,
	tags: true,
	left: 0,
	width: '100%',
	height: '80%',
	align: 'left',
	vi: true,
	scrollbar: {
		ch: ' ',
		track: {
			bg: '#333333'
		},
		style: {
			inverse: true
		},
	},
	style: {
		header: {
			fg: 'blue',
			bold: true
		},
		cell: {
			selected: {
				underline: true,
				bg: "#000033",
			},
		}
	},
})

list.key(['o'], (ch, key) => {
	let selection = model.selection
	if( selection.length == 0 ){
		selection = model.notifications[list.selected-1]
	}
	selection.forEach(([repo_id, n_id]) => {
		const url = model.tree[repo_id].nodes[n_id].url
		exec(`open -g ${url}`)
	})
})
list.key(['enter'], (ch, key) => {
	const [repo_id, n_id] = model.notifications[list.selected-1]
	const url = model.tree[repo_id].nodes[n_id].url
	exec(`open ${url}`)
})
list.on('select item', () => {
	program.cursorPos(list.childOffset,2)
	screen.render()
})
list.on('focus', () => {
	program.cursorPos(list.childOffset,2)
	program.showCursor()
})
list.key(['space','x'], (ch, key) => {
	let under_cursor = model.notifications[list.selected-1]
	if( model.isSelected( ...under_cursor ) ) {
		model.selection = model.selection.filter(([r,k]) => !(r == under_cursor[0] && k == under_cursor[1]) )
	} else {
		model.selection.push( under_cursor )
	}
	list.setItem( list.selected, list.getRowText(reduceItem(under_cursor[0], under_cursor[1])) )
	screen.render()
})

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
	content: '{bold}{inverse} o {/} Open    {bold}{inverse} m {/} Mute    {bold}{inverse} q {/} Quit',
})

var loader = blessed.loading({
  parent: screen,
  height: 'shrink',
  width: 'half',
  top: 'center',
  left: 'center',
  tags: true,
});

screen.append(list)
screen.append(loader)
screen.append(statusbar)
screen.append(cmdline)

screen.title = 'my window title';
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
	return screen.destroy()
})
screen.key(['space'], function(ch, key) {
	return screen.render()
})
screen.key(['/'], function(ch, key) {
	screen.saveFocus()
	cmdline.focus()
	cmdline.setValue("/")
	cmdline.readInput(function(err, data) {
		if (err) return
		if( data === null ){
			cmdline.setValue('')
			data = ""
		} else {
			data = data.substr(1)
		}
		model.search_phrase = data
		model.linearize()
		list.setData( reduceView(model) )
		list.focus()
		return screen.render()
	});
	return screen.render()
})


list.focus()
loader.load('Loading...')

screen.render()
