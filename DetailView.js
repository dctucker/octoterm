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
		this.box.focus()
		this.box.setFront()
	}
	load(){
		this.model.load().then(() => {
			const { title, url, when, body, author, state, timeline } = this.model
			let c = ""
			this.box.setLabel(` {bold}{underline}${title}{/bold}{/underline} [${state}] `)
			c += `{#333333-bg} \n`
			c += `{#555555-bg}{bold}@${author}{/bold} — ${when}\n{#333333-bg}${body}\n \n`
				/*
			c += comments.map(comment => {
				const { title, author, when } = comment
				return `{#555555-bg}{bold}@${author}{/bold} — ${when}\n{#333333-bg}${title}\n`
			}).join("\n")
			*/
			c += timeline.map(e => {
				const { body, author, when } = e
				switch( e.__typename ){
					case "IssueComment":
						return `{#555555-bg}{bold}@${author.login}{/bold} — ${when}\n{#333333-bg}${body}\n`
					case "Commit":
						return `{#33cccc-fg} ⟜  {bold}@${author.user.login}{/} — {#000000-bg}${body.split("\n")[0]}{/}\n`
					case "PullRequestReview":
						return `{#555555-bg}{bold}@${author.login}{/bold} — reviewed at ${when}\n` +
							`{#333333-bg}${body}\n` +
							e.comments.nodes.filter(comment => comment.position !== null).map(comment => {
								return `\n{underline}${comment.path}{/underline}:${comment.position}\n${comment.body}`
							}).join("\n") + "\n"
					case "CrossReferencedEvent":
						return `{#33cccc-fg} ➚  {bold}@${e.actor.login}{/bold}` +
							` referenced {/}` +
							`${e.target.title} {#33cccc-fg}from{/} ${e.source.title}\n`
					default:
						return `    {#33cccc-fg}${e.__typename}{/}\n`
				}
			}).join("\n")
			
			this.box.setContent(c)
			this.screen.render()
		})
	}
	destroy(){
		this.box.hide()
		this.box.destroy()
		delete this.model
	}
}

module.exports = DetailView
