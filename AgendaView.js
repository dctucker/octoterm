const blessed = require('blessed')
const { exec } = require('child_process')

class AgendaView {
	constructor(screen, model){
		this.model = model
		this.screen = screen
		this.setupScreen()
	}
	reduceItem(repo_id, key) {
		let repo  = this.model.tree[repo_id]
		let notif = repo.nodes[key]
		let state = notif.state
		if(state === "MERGED"){
			state = "{magenta-bg}MERGED{/}"
		} else if(state === "CLOSED"){
			state = "{red-bg}CLOSED{/}"
		}
		let reason = notif.reason.replace('_',' ')
		let title = notif.title
		if( this.model.isSelected(repo_id, key) ) {
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

	reduceView() {
		let data = this.model.notifications.map(([repo_id, key]) => {
			return this.reduceItem(repo_id, key)
		})
		return [['','State','Reason','Title','When'],...data]
	}

	setupScreen(){
		this.loader = blessed.loading({
			parent: this.screen,
			height: 1,
			width: 'half',
			top: '100%-3',
			left: 0,
			tags: true,
		});

		var list = blessed.listtable({
			parent: this.screen,
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
			let selection = this.model.selection
			if( selection.length == 0 ){
				selection = [ this.model.notifications[list.selected-1] ]
			}
			selection.forEach(([repo_id, n_id]) => {
				const url = this.model.tree[repo_id].nodes[n_id].url
				exec(`open -g ${url}`)
			})
		})
		list.key(['enter'], (ch, key) => {
			const [repo_id, n_id] = this.model.notifications[list.selected-1]
			const url = this.model.tree[repo_id].nodes[n_id].url
			exec(`open ${url}`)
		})
		list.key(['r'], (ch, key) => {
			this.loader.load('Loading...')
			this.model.load().then((agenda) => {
				this.loader.stop()
				this.model.linearize()
				//console.dir(this.model.tree, {depth:null})
				//console.log(this.model.notifications)
				list.setData( this.reduceView() )
				this.screen.render()
			})
		})
		list.on('select item', () => {
			this.screen.program.cursorPos(list.childOffset,2)
			this.screen.render()
		})
		list.on('focus', () => {
			this.screen.program.cursorPos(list.childOffset,2)
			this.screen.program.showCursor()
		})
		list.key(['space','x'], (ch, key) => {
			let under_cursor = this.model.notifications[list.selected-1]
			if( this.model.isSelected( ...under_cursor ) ) {
				this.model.selection = this.model.selection.filter(([r,k]) => !(r == under_cursor[0] && k == under_cursor[1]) )
			} else {
				this.model.selection.push( under_cursor )
			}
			list.setItem( list.selected, list.getRowText(this.reduceItem(under_cursor[0], under_cursor[1])) )
			this.screen.render()
		})
		this.list = list
	}
}

module.exports = AgendaView
