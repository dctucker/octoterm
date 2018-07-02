const blessed = require('blessed')
const { exec } = require('child_process')

class AgendaView {
	constructor(screen, model){
		this.model = model
		this.screen = screen
		this.setupScreen()
		this.currentColumn = 0
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
			repo.repo,
			title,
			notif.updated_at,
		]
	}

	reduceView() {
		let data = this.model.notifications.map(([repo_id, key]) => {
			return this.reduceItem(repo_id, key)
		})
		return [['','State','Reason','Repository', 'Title','When'],...data]
	}

	columnPos(){
		return this.currentColumn
	}

	moveColumn(delta){
		this.currentColumn += delta
		this.refreshCursor()
	}

	refreshCursor(){
		this.screen.program.cursorPos(this.list.childOffset, this.columnPos())
		this.screen.program.showCursor()
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
						underline: true,
						bg: "#000033",
					},
				}
			},
		})

		list.getRowText = function(row) {
			var self = this
				, align = this.__align;
	
			var text = '';
			row.forEach(function(cell, i) {
				var width = self._maxes[i];
				var clen = self.strWidth(cell);
	
				if (i !== 0) {
					text += ' ';
				}
	
				while (clen < width) {
					if (align === 'center') {
						cell = ' ' + cell + ' ';
						clen += 2;
					} else if (align === 'left') {
						cell = cell + ' ';
						clen += 1;
					} else if (align === 'right') {
						cell = ' ' + cell;
						clen += 1;
					}
				}
	
				if (clen > width) {
					if (align === 'center') {
						cell = cell.substring(1);
						clen--;
					} else if (align === 'left') {
						cell = cell.slice(0, -1);
						clen--;
					} else if (align === 'right') {
						cell = cell.substring(1);
						clen--;
					}
				}
	
				text += cell;
			});
			return text
		};


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
		this.list = list
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
			const url = this.model.node(repo_id,n_id).url
			exec(`open -g ${url}`)
		})
	}

	toggleSelection(){
		let under_cursor = this.getUnderCursor()
		if( this.model.isSelected( ...under_cursor ) ) {
			this.model.selection = this.model.selection.filter(([r,k]) => !(r === under_cursor[0] && k === under_cursor[1]) )
		} else {
			this.model.selection.push( under_cursor )
		}
		this.list.setItem( this.list.selected, this.list.getRowText(this.reduceItem(under_cursor[0], under_cursor[1])) )
		this.screen.render()
	}

	getSelection(){
		let selection = this.model.selection
		if( selection.length == 0 ){
			selection = [ this.getUnderCursor() ]
		}
		return selection
	}

	getUnderCursor(){
		return this.model.notifications[ this.list.selected - 1 ]
	}

	reload(){
		this.loader.load('Loading...')
		this.model.load().then((agenda) => {
			this.loader.stop()
			this.model.linearize()
			//console.dir(this.model.tree, {depth:null})
			//console.log(this.model.notifications)
			this.invalidate()
			this.list.focus()
			this.screen.render()
		})
	}

	invalidate() {
		this.list.setData( this.reduceView() )
	}
}

module.exports = AgendaView
