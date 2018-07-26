const blessed = require('blessed')
const caught = require('./Error')
const { colors } = require('./storage').getItem('options')
const { dateFormat, getContrastColor, renderLabels } = require('./helpers')

const renderReactions = (reactionGroups) => {
	const title_bg = `{${colors.title.bg}-bg}`
	const emoji = {
		THUMBS_UP: '👍',
		THUMBS_DOWN: '👎',
		LAUGH: '😄',
		HOORAY: '🎉',
		CONFUSED: '😕',
		HEART: '💛',
	}
	const reactions = reactionGroups.map(reaction => {
		if( reaction.users.totalCount === 0 ){
			return ""
		}
		return `${title_bg} ${emoji[reaction.content]} ${reaction.users.totalCount} {/} `
	}).join('')

	return (reactions.length > 0 ? `\n${reactions}\n` : '')
}

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
			const popup_bg = `{${colors.popup.bg}-bg}`
			const title_bg = `{${colors.title.bg}-bg}`
			const event_fg = `{${colors.event.fg}-fg}`
			const { title, url, body, author, state, timeline } = this.model
			let c = ""
			this.box.setLabel(` {bold}{underline}${title}{/bold}{/underline} [${state}] `)
			c += `${popup_bg} \n`
			c += `${title_bg}{bold}@${author}{/bold} — ${dateFormat(this.model.when)}\n${popup_bg}${body}\n \n`
			c += timeline.map(e => {
				const { body, author, actor } = e
				const when = dateFormat(e.when)
				switch( e.__typename ){
					case "IssueComment":
						const reactions = renderReactions(e.reactionGroups)
						return `\n${title_bg}{bold}@${author.login}{/bold} — ${when}\n${popup_bg}${body}    \n${reactions}`
					case "Commit":
						return `${event_fg}-○- {bold}@${author.user.login}{/} committed {#000000-bg}${body.split("\n")[0]}{/}`
					case "PullRequestReview":
						return `\n${title_bg}{bold}@${author.login}{/bold} — reviewed at ${when}\n${popup_bg}` +
							(body.length === 0 ? "" : `${body}    \n`) +
							e.comments.nodes.filter(comment => comment.position !== null).map(comment => {
								return `{underline}${comment.path}{/underline}:${comment.position}\n${comment.body}\n`
							}).join("\n") + "\n"
					case "CrossReferencedEvent":
						return `${event_fg} ★  {bold}@${actor.login}{/bold}` +
							` referenced {/}` +
							`${e.target.title} {#33cccc-fg}from{/} ${e.source.title}`
					case "RenamedTitleEvent":
						return `${event_fg} ✎  {bold}@${actor.login}{/bold} renamed from{/} ${e.previousTitle}`
					case "ReviewRequestedEvent":
						if( e.whom ){
							return `${event_fg} ⦿  {bold}@${actor.login}{/bold} requested review from{/} ${e.whom}`
						}
					case "LabeledEvent":
						if( ! e.label ){
							break
						}
						if( actor ){
							return `${event_fg} ❏  {bold}@${actor.login}{/bold} added ` + renderLabels([e.label])
						} else {
							return `${event_fg} ❏  added ` + renderLabels([e.label])
						}
					case "AssignedEvent":
						return `${event_fg} ☻  {bold}@${actor.login}{/bold} assigned {bold}@${e.user.login}{/bold}`
					default:
						return `    ${event_fg}${e.__typename}{/}`
				}
			}).join("\n")
			
			this.box.setContent(c)
			this.screen.render()
		}).catch(err => {
			this.destroy()
			return caught(this, err)
		})
	}
	destroy(){
		this.box.hide()
		this.box.destroy()
		delete this.model
	}
}

module.exports = DetailView
