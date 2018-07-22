const blessed = require('blessed')
const { colors } = require('./storage').getItem('options')

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
			height: "80%",
			left: "10%",
			width: "80%",
			transparent: false,
			tags: true,
			content: '',
			keys: true,
			vi: true,
			scrollable: true,
			alwaysScroll: true,
			scrollbar: {
				ch: ' ',
				inverse: true
			},
			border: {
				type: 'line'
			},
			style: {
				bg: colors.popup.bg,
				border: colors.border,
			},
		})
		this.box.key(['escape'], () => {
			this.box.hide()
			this.screen.render()
		})
		this.box.focus()
		this.box.setFront()
	}
	load(){
		this.model.load().then(() => {
			const { title, url, state, commits, comments } = this.model
			let c = ""
			c += `{bold}{underline}${title}{/bold}{/underline} [${state}]\n`
			c += `{#333333-bg} \n`
			c += comments.map(comment => {
				const { title, author, when } = comment
				return `{#555555-bg}{bold}@${author}{/bold} — ${when}\n{#333333-bg}${title}\n`
			}).join("\n")
			
			this.box.setContent(c)
			this.screen.render()
		})
	}
}

module.exports = DetailView
