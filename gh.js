#!/usr/bin/env node
'use strict';

const fetch = require('node-fetch')
const blessed = require('blessed')

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
	linearlize(agenda) {
		var notifications = []
	}
}

var model = new Agenda
model.load().then((agenda) => {
	console.dir(model.tree, {depth:null})
	list.setData([['a','b','c'],['1','2','3']])
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

var list = blessed.listtable({
	top: 0,
	left: 0,
	width: '100%',
	height: 25,
})
screen.append(list);
list.focus();

screen.render();
