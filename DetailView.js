const blessed = require('blessed')
const { patch_notification } = require('./api')
const caught = require('./Error')
const { EventView, renderReactions } = require('./EventView')
const { colors } = require('./storage').getItem('options')
const { dateFormat, getContrastColor, renderLabels } = require('./helpers')

class DetailView {
	constructor(screen, model){
		this.screen = screen
		this.model = model
		this.setupScreen()
	}
	setupScreen(){
		this.box = blessed.box({
			parent: this.screen,
			top: 2,
			height: '80%',
			left: '10%',
			width: '80%',
			transparent: false,
			tags: true,
			content: ' ',
			label: ' ',
			mouse: true,
			keys: true,
			vi: true,
			scrollable: true,
			alwaysScroll: true,
			scrollbar: {
				ch: ' ',
				inverse: true
			},
			padding: {
				left: 1,
				right: 1,
				top: 0,
				bottom: 0,
			},
			border: {
				type: 'line'
			},
			style: {
				bg: colors.popup.bg,
				border: colors.border,
				label: {
					inverse: true,
					...colors.border,
				},
			},
		})
		this.box.key(['escape'], () => {
			this.destroy()
			this.screen.render()
		})
		this.box.key(['pageup'], () => {
			this.box.scroll(-this.box.height || -1);
			this.screen.render();
		})
		this.box.key(['pagedown'], () => {
			this.box.scroll(this.box.height || 1);
			this.screen.render();
		})
		this.box.key(['['], () => {
			if( this.scrollPos > 0 ){
				this.scrollPos -= 1
			}
			this.box.scrollTo(this.screenLines[this.scrollPos])
		})
		this.box.key([']'], () => {
			if( this.scrollPos < this.screenLines.length - 1 ){
				this.scrollPos += 1
			}
			this.box.scrollTo(this.screenLines[this.scrollPos])
		})
		this.box.focus()
		this.box.setFront()
	}
	load(){
		this.model.load().then(() => {
			if( ! this.model ){
				return // if destroy() gets called before completion
			}
			const popup_bg = `{${colors.popup.bg}-bg}`
			const title_bg = `{${colors.title.bg}-bg}`
			const event_fg = `{${colors.event.fg}-fg}`
			const { title, url, body, author, state, timeline } = this.model
			const reactions = renderReactions(this.model.reactionGroups)
			let c = ""
			this.box.setLabel(` {bold}{underline}${title}{/bold}{/underline} [${state}] `)
			c += `${popup_bg} \n`
			c += `${title_bg}{bold}${author}{/bold} — ${dateFormat(this.model.when)}\n${popup_bg}${body}\n${reactions}\n`
			this.box.setContent(c)

			const lines = timeline.map(e => {
				const currentLine = this.box.getScreenLines().length
				this.box.pushLine( new EventView(e).render() )
				if( e.__typename === 'IssueComment' || e.__typename === 'PullRequestReview' ){
					return currentLine
				} else {
					return -1
				}
			}).filter(val => val > 0)
			this.box.pushLine("{black-fg}" + ("_".repeat(this.box.width - 5)))
			this.box.pushLine( "\n".repeat(this.box.height - 4) )
			this.screenLines = [0, ...lines]
			this.scrollPos = 0
			
			this.screen.render()
		}).catch(err => {
			this.screen.destroy()
			console.dir(err)
			this.destroy()
			return caught(this, err)
		})
	}
	destroy(){
		if( this.thread_id ){
			patch_notification(this.thread_id)
		}
		this.box.hide()
		this.box.destroy()
		delete this.model
	}
}

module.exports = DetailView
