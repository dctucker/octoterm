const blessed = require('blessed')
const { exec } = require('child_process')
const store = require('./storage')
const { colors } = store.getItem("options")
const Detail = require('./Detail')
const DetailView = require('./DetailView')
const caught = require('./Error')
const { dateFormat, getContrastColor, renderLabels } = require('./helpers')

const lang = {
	__typename: 'Type',
	reason: 'Reason',
}

class AgendaView {
	constructor(screen, model){
		this.model = model
		this.screen = screen
		this.currentColumn = 0
		this.columns = {
			__typename: {
				header: '',
				render: ({notif}) => {
					let star = this.model.isStarred(notif) ? '*' : ' '
					let symbol = {
						"Issue": "I",
						"PullRequest": "PR",
						"Commit": "c",
					}[notif.__typename] || notif.type
					return notif.unread ? `{bold}${star}${symbol}{/bold}` : `${star}${symbol}`
				},
			},
			reason: {
				header: '',
				render: ({notif}) => {
					return {
						'assign': '{#cccccc-fg}A{/}',
						'author': '{#cccccc-fg}a{/}',
						'comment': '{#cccccc-fg}C{/}',
						'mention': '{#cccccc-fg}@{/}',
						'manual': '{#cccccc-fg}m{/}',
						'team_mention': '{#666666-fg}t{/}',
						'review_requested': '{#666666-fg}r{/}',
						'subscribed': '{#555555-fg}s{/}',
					}[notif.reason] || notif.reason
				},
			},
			state: {
				header: 'State',
				render: ({notif}) => {
					let state = notif.state
					if(state === "MERGED"){
						state = "{magenta-bg}MERGED{/magenta-bg}"
					} else if(state === "CLOSED"){
						state = "{red-bg}CLOSED{/red-bg}"
					}
					return state
				},
			},
			repo: {
				header: 'Repository',
				render: ({notif}) => {
					const trunclen = 15
					let str = notif.repo
					if( str.length < trunclen ){
						return str
					}
					let first = str.substring(0,trunclen-3)
					let remainder = str.substring(trunclen-3)
					if( remainder.length <= 10 ){
						first = str.substring(0,trunclen-2)
						remainder = str.substring(trunclen-2)
					}
					let last = str[str.length-1]
					return `${first}{#888888-fg}${remainder.length}{/}${last}`
				},
			},
			labels: {
				header: 'Title',
				render: ({notif,repo_id,n_id}) => {
					let title = notif.title
					if( this.model.isSelected(repo_id, n_id) ) {
						title = `{bold}{underline}${title}{/underline}{/bold}`
					}
					return title + ' ' + renderLabels(notif.labels || [])
				},
			},
			author: {
				header: 'Author',
				render: ({notif}) => notif.author,
			},
			participants: {
				header: 'Participants',
				render: ({notif}) => notif.participants.join(' '),
			},
			updated_at: {
				header: 'When',
				render: ({notif}) => dateFormat(notif.updated_at),
			},
		}
		this.shownColumns = [
			'__typename',
			'reason',
			'state',
			'repo',
			'labels',
			'author',
			'updated_at',
		]
		this.setupScreen()
	}

	reduceItem(repo_id, n_id) {
		const repo  = this.model.tree[repo_id]
		const notif = repo.nodes[n_id]
		return this.shownColumns.map(k => {
			return this.columns[k].render({repo_id, n_id, repo, notif}) || ""
		})
	}

	reduceView() {
		const data = this.model.notifications.map(([repo_id, key]) => {
			return this.reduceItem(repo_id, key)
		})
		const header = this.shownColumns.map(k => {
			return this.columns[k].header
		})
		return [ header, ...data ]
	}

	sortShownColumns() {
		let ret = []
		for( const id in this.columns ){
			if( this.shownColumns.indexOf(id) >= 0 ){
				ret.push(id)
			}
		}
		this.shownColumns = ret
	}

	addColumn(){
		//this.list.hide()
		this.columnList.focus()
	}

	setupScreen(){
		this.loader = blessed.loading({
			parent: this.screen,
			height: 1,
			width: 'half',
			top: '100%-3',
			left: 0,
			tags: true,
			transparent: false,
			style: {
				bg: 'blue',
				fg: 'cyan',
			},
		});
		this.cmdline = blessed.textbox({
			parent: this.screen,
			top: '100%-2',
			height: 1,
			left: 0,
			right: 0,
			bg: 'black'
		})

		this.columnList = blessed.list({
			parent: this.screen,
			interactive: true,
			keys: true,
			mouse: true,
			vi: true,
			top: 3,
			left: 'center',
			width: 'shrink',
			height: 10,
			border: {
				type: 'line'
			},
			items: Object.entries(this.columns).map(([id,column]) => {
				return column.header.length === 0 ? lang[id] : column.header
			}),
			style: {
				border: colors.border,
				bg: colors.popup.bg,
				item: {
					fg: colors.fg,
				},
				selected: {
					bg: colors.selected.bg,
					fg: colors.selected.fg,
				},
			},
		})
		const columnListCursor = () => {
			this.screen.program.cursorPos(1+this.columnList.top + this.columnList.childOffset, 1+this.columnList.left)
			this.screen.program.showCursor()
		}
		this.columnList.on('focus', () => {
			this.list.style.selected.bg = colors.bg
			this.columnList.setFront()
			this.columnList.show()
			columnListCursor()
		})
		this.columnList.on('cancel', () => {
			this.list.focus()
			this.screen.render()
		})
		this.columnList.on('blur', () => {
			this.list.style.selected.bg = colors.selected.bg
			this.columnList.hide()
		})
		this.columnList.on('select item', () => {
			columnListCursor()
		})
		this.columnList.key(['enter'], (ch, key) => {
			const [id, name] = Object.entries(this.columns)[this.columnList.selected]
			if( this.shownColumns.indexOf(id) >= 0 ){
				this.shownColumns = this.shownColumns.filter((column) => column !== id)
			} else {
				this.shownColumns.push(id)
			}
			this.sortShownColumns()
			this.invalidate()
			columnListCursor()
		})

		var list = blessed.listtable({
			parent: this.screen,
			interactive: true,
			keys: true,
			top: 0,
			tags: true,
			left: 0,
			width: '100%',
			height: '100%-3',
			align: 'left',
			vi: true,
			mouse: true,
			invertSelected: false,
			//border: true,
			scrollbar: {
				ch: ' ',
				track: {
					bg: colors.scrollbar.bg,
				},
				style: {
					inverse: true
				},
			},
			style: {
				header: {
					fg: colors.header.fg,
					bold: true,
				},
				cell: {
					selected: {
						bg: colors.selected.bg,
					},
				}
			},
		})

		list.key(['enter'], (ch, key) => {
			const [repo_id, n_id] = this.getUnderCursor()
			const notif = this.model.node(repo_id, n_id)
			exec(`open ${notif.url}`)
			notif.unread = false
			const row = 1 + this.model.notifications.findIndex(([r,n]) => r == repo_id && n == n_id )
			this.invalidateRow(row)
			this.screen.render()
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
			}).catch(err => {
				return caught(this, err)
			})
		})
	}

	openSelection(){
		const selection = this.getSelection()
		selection.forEach(([repo_id, n_id]) => {
			const notif = this.model.node(repo_id, n_id)
			exec(`open -g ${notif.url}`)
			notif.unread = false
			const row = 1 + this.model.notifications.findIndex(([r,n]) => r == repo_id && n == n_id )
			this.invalidateRow(row)
		})
		this.model.updateStars(selection)
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

	reload(fromStorage=false){
		if( fromStorage ){
			this.loader.stop()
			this.model.loadFromStorage()
			this.model.linearize()
			this.screen.title = `Octoterm (${this.model.notifications.length})`
			this.invalidate()
			this.list.focus()
			this.screen.render()
			return
		}
		this.loader.load('Loading...')
		this.loader.setFront()
		this.model.load().then((agenda) => {
			this.loader.stop()
			this.model.linearize()
			this.screen.title = `Octoterm (${this.model.notifications.length})`
			this.invalidate()
			this.list.focus()
			this.screen.render()
		}).catch(err => {
			this.reload(true)
			this.screen.destroy()
			throw err
			//console.dir(err, {depth:null})
			//return caught(this, err)
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

	inspect() {
		if( this.detailView ){
			this.detailView.destroy()
			delete this.detailView
		}

		const [ repo_id, node_id ] = this.getUnderCursor()
		const notif = this.model.node(repo_id, node_id)
		const { owner, repo } = this.model.tree[repo_id]

		this.detail = new Detail( owner, repo, notif.number )
		this.detailView = new DetailView(this.screen, this.detail)
		this.detailView.load()
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

	quit() {
		this.screen.destroy()
	}
}

module.exports = AgendaView
