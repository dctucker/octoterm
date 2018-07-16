const blessed = require('blessed')
const { exec } = require('child_process')

const getContrastColor = (color) => {
	let r = parseInt(color.substr(0,2), 16)
	let g = parseInt(color.substr(2,2), 16)
	let b = parseInt(color.substr(4,2), 16)
    let a = 1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return a < 0.5 ? 'black' : 'white'
}

const renderLabels = (labels) => {
	return labels.map((label) => {
		let fg = getContrastColor(label.color)
		return `{${fg}-fg}{#${label.color}-bg}${label.name}{/}`
	}).join(' ')
}

class AgendaView {
	constructor(screen, model){
		this.model = model
		this.screen = screen
		this.setupScreen()
		this.currentColumn = 0
		this.columns = {
			__typename: ({notif}) => {
				let star = this.model.isStarred(notif) ? '*' : ' '
				let symbol = notif.__typename === "Issue" ? "I" : "PR"
				return notif.unread ? `{bold}${star}${symbol}{/bold}` : `${star}${symbol}`
			},
			state: ({notif}) => {
				let state = notif.state
				if(state === "MERGED"){
					state = "{magenta-bg}MERGED{/magenta-bg}"
				} else if(state === "CLOSED"){
					state = "{red-bg}CLOSED{/red-bg}"
				}
				return state
			},
			reason: ({notif}) => notif.reason.replace('_',' '),
			repo: ({notif}) => notif.repo,
			title: ({notif,repo_id,n_id}) => {
				let title = notif.title
				if( this.model.isSelected(repo_id, n_id) ) {
					title = `{bold}{underline}${title}{/underline}{/bold}`
				}
				return title + ' ' + renderLabels(notif.labels)
			},
			author: ({notif}) => notif.author,
			//participants: ({notif}) => notif.participants.join(' '),
			updated_at: ({notif}) => notif.updated_at,
		}
	}

	reduceItem(repo_id, n_id) {
		let repo  = this.model.tree[repo_id]
		let notif = repo.nodes[n_id]
		return Object.entries(this.columns).map(([k,v]) => {
			return v({repo_id, n_id, repo, notif}) || ""
		})
	}

	reduceView() {
		let data = this.model.notifications.map(([repo_id, key]) => {
			return this.reduceItem(repo_id, key)
		})
		return [['','State','Reason','Repository', 'Title','Author','When'],...data]
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
		this.cmdline = blessed.textbox({
			parent: this.screen,
			top: '100%-2',
			height: 1,
			left: 0,
			right: 0,
			bg: 'black'
		})

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
			mouse: true,
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
						bg: "#000033",
					},
				}
			},
		})

		list.key(['enter'], (ch, key) => {
			const [repo_id, n_id] = this.getUnderCursor()
			const url = this.model.node(repo_id,n_id).url
			exec(`open ${url}`)
		})
		list.on('select item', () => {
			this.refreshCursor()
			this.screen.render()
		})
		list.on('focus', () => {
			this.refreshCursor()
		})
		list.key(['left','h'] , (ch, key) => this.moveColumn(-1))
		list.key(['right','l'], (ch, key) => this.moveColumn(1))

		this.list = list
	}

	columnPos(){
		let pos = 0
		this.list._maxes.slice(0, this.currentColumn).forEach((val) => {
			pos += val + 1
		})
		return pos
	}

	moveColumn(delta){
		let col = this.currentColumn + delta
		if( col >= 0 && col < this.list._maxes.length ){
			this.currentColumn = col
		}
		this.refreshCursor()
	}

	refreshCursor(){
		this.screen.program.cursorPos(this.list.childOffset, this.columnPos())
		this.screen.program.showCursor()
	}

	moveCursorOver(repo_id, n_id){
		this.list.select(1+this.model.notifications.findIndex(([r,n]) => r == repo_id && n == n_id))
	}

	muteSelection(){
		this.getSelection().forEach(([repo_id, n_id]) => {
			this.model.mute(repo_id, n_id).then(() => {
				this.invalidate()
			})
		})
	}

	openSelection(){
		this.getSelection().forEach(([repo_id, n_id]) => {
			const notif = this.model.node(repo_id, n_id)
			exec(`open -g ${notif.url}`)
			notif.unread = false
			const row = 1 + this.model.notifications.findIndex(([r,n]) => r == repo_id && n == n_id )
			this.invalidateRow(row)
		})
		this.screen.render()
	}

	starCurrent(){
		const underCursor = this.getUnderCursor()
		const star = this.model.getStar(...underCursor)
		if( ! star ){
			this.model.addStar(...underCursor)
		} else {
			this.model.removeStar(...underCursor)
		}
		this.list.setItem( this.list.selected, this.list.getRowText(this.reduceItem(underCursor[0], underCursor[1])) )
		this.screen.render()
	}

	toggleSelection(){
		let underCursor = this.getUnderCursor()
		if( this.model.isSelected( ...underCursor ) ) {
			this.model.selection = this.model.selection.filter(([r,k]) => !(r === underCursor[0] && k === underCursor[1]) )
		} else {
			this.model.selection.push( underCursor )
		}
		this.list.setItem( this.list.selected, this.list.getRowText(this.reduceItem(underCursor[0], underCursor[1])) )
		this.screen.render()
	}

	deselectAll(){
		this.model.selection = []
		this.invalidate()
	}

	selectAll(){
		const { model } = this
		model.selection = [...model.notifications]
		this.invalidate()
	}

	toggleSelectAll(){
		if( this.model.selection.length === 0 ){
			this.selectAll()
		} else {
			this.deselectAll()
		}
	}

	getSelection(){
		let selection = this.model.selection
		if( selection.length == 0 ){
			selection = [ this.getUnderCursor() ]
		}
		return selection
	}

	getUnderCursor(){
		return this.model.notifications[ this.list.selected - 1 ] || [ null, null ]
	}

	getCellUnderCursor(){
		return this.getUnderCursor()
	}

	reload(){
		this.loader.load('Loading...')
		this.model.load().then((agenda) => {
			this.loader.stop()
			this.model.linearize()
			this.screen.title = `Octoterm (${this.model.notifications.length})`
			this.invalidate()
			this.list.focus()
			this.screen.render()
		})
	}

	invalidate() {
		this.list.clearPos()
		this.list.setData( this.reduceView() )
		return this.screen.render()
	}

	invalidateRow(row) {
		const [repo_id, n_id] = this.model.notifications[row-1]
		this.list.setItem( row, this.list.getRowText(this.reduceItem(repo_id, n_id)) )
	}

	updateCmdline() {
		const { columnFilter, search } = this.model.filters
		this.cmdline.setValue([
			columnFilter ? columnFilter.description : "",
			search ? search.description : "",
		].join(''))
	}

	search() {
		const { screen, cmdline, model, list } = this
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
			model.search(''+data)
			model.linearize()
			this.invalidate()
			list.focus()
			this.updateCmdline()
			return screen.render()
		});
		return screen.render()
	}

	columnFilter() {
		const [r,n] = this.getUnderCursor()
		const notif = this.model.node(r,n)
		let column_name = "", cell_value = ""
		if( notif && this.model.filters.columnFilter === undefined ){
			column_name = Object.entries(this.columns)[this.currentColumn][0]
			cell_value = notif[column_name]
		}
		this.model.columnFilter(column_name, cell_value)
		this.model.linearize()
		this.invalidate()
		this.moveCursorOver(r,n)
		this.updateCmdline()
		return this.screen.render()
	}
}

module.exports = AgendaView
