const { get_notifications, graphql, build_agenda, build_graphql_query, query_notifications } = require('./api')
const { foreach } = require('./helpers')

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

module.exports = Agenda
