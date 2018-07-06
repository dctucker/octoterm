const {
	get_notifications,
	patch_notification,
	graphql,
	build_agenda,
	build_graphql_query,
	build_graphql_mutation,
	query_notifications,
} = require('./api')
const { foreach } = require('./helpers')

class Agenda {
	constructor(){
		this.clear()
	}
	clear() {
		this.tree = {}
		this.filters = {}
		this.notifications = []
		this.selection = []
	}
	load() {
		this.clear()
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
			foreach( repo.nodes, (n_id, notif) => {
				for(var f in this.filters){
					if( ! this.filters[f].callback({repo_id, repo, n_id, notif}) ){
						return
					}
				}
				notifications.push([repo_id, n_id])
			})
		})
		notifications.sort(([r0,k0],[r1,k1]) => {
			return this.node(r1,k1).updated_at.localeCompare( this.node(r0,k0).updated_at )
		})
		this.notifications = notifications
	}
	search(search_phrase){
		if(search_phrase.length === 0){
			delete this.filters.search
		} else {
			this.filters.search = {
				callback: ({notif}) => notif.title.indexOf(search_phrase) >= 0,
				description: `/${search_phrase}`,
			}
		}
	}
	columnFilter(column_name, cell_value){
		if( column_name.length === 0 ){
			delete this.filters.columnFilter
		} else {
			console.log(cell_value)
			if( Array.isArray(cell_value) && cell_value.length > 0 ){
				this.filters.columnFilter = {
					callback: ({repo, notif}) => notif[column_name].indexOf(cell_value[0]) >= 0,
					description: `=${column_name}:${cell_value[0]}`,
				}
			} else {
				this.filters.columnFilter = {
					callback: ({repo, notif}) => notif[column_name] === cell_value,
					description: `=${column_name}:${cell_value}`,
				}
			}
		}
	}
	isSelected(repo_id, key) {
		return this.selection.findIndex(([r,k]) => r == repo_id && k == key ) >= 0
	}
	node(repo_id, n_id) {
		return this.tree[repo_id] ? this.tree[repo_id].nodes[n_id] : null
	}
	mute(repo_id, n_id) {
		const node = this.node(repo_id, n_id)
		if( ! node ) return
		return graphql(build_graphql_mutation(node.id)).then((data) => {
			return patch_notification(node.thread_id)
		}).then(() => {
			const del = ([r,n]) => {
				return ! ( n === n_id && r === repo_id )
			}
			this.notifications = this.notifications.filter(del)
			this.selection = this.selection.filter(del)
			delete this.tree[repo_id].nodes[n_id]
		})
	}
}

module.exports = Agenda
