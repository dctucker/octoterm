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
	linearize() {
		let notifications = []
		foreach( this.tree, (repo_id, repo) => {
			foreach( repo.nodes, (key, d) => {
				/*
				if( this.search_phrase.length > 0 ){
					if( d.title.contains(search_phrase) ){
						continue
					}
				}
				*/
				notifications.push([repo_id, key])
			})
		})
		//def sortfunc(a):
		//	return this.tree[a[0]]["nodes"][a[1]]["updated_at"]
		//this.notifications = sorted(this.notifications, key=sortfunc, reverse=True)
		this.notifications = notifications
	}
}

var model = new Agenda
model.load().then((agenda) => {
	model.linearize()
	//console.dir(model.tree, {depth:null})
	//console.log(model.notifications)
	//let table = [['','State','Reason','Title','When']]
	let data = model.notifications.map(([repo_id, key]) => {
		let repo  = model.tree[repo_id]
		let notif = repo.nodes[key]
		let state = notif.state
		if(state === "MERGED"){
			state = "{magenta-bg}MERGED{/}"
		} else if(state === "CLOSED"){
			state = "{red-bg}CLOSED{/}"
		}
		return [
			notif.__typename == "Issue" ? "I" : "PR",
			state,
			notif.reason,
			notif.title,
			notif.updated_at,
		]
	})
	let table = [['','State','Reason','Title','When'],...data]
	list.setData(table)
	screen.render()
})


// Create a screen object.
var screen = blessed.screen({
  smartCSR: true
});

screen.title = 'my window title';
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});
screen.key(['space'], function(ch, key) {
  return screen.render()
});

var list = blessed.listtable({
	parent: screen,
	interactive: true,
	keys: true,
	top: 0,
	tags: true,
	left: 0,
	width: '100%',
	height: 25,
	vi: true,
	style: {
		cell: {
			selected: {
				underline: true,
				bg: "#000033",
			},
		}
	},
})

list.key(['o','enter'], function(ch, key){
	const [repo_id, n_id] = model.notifications[list.selected-1]
	const url = model.tree[repo_id].nodes[n_id].url
	const g = ch === 'o' ? '-g' : ''
	exec(`open ${g} ${url}`)
})

screen.append(list);
list.focus();

screen.render();
