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
		HEART: '{red-fg}{bold}❤️{/bold}{/red-fg}',
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
	renderEvent(e){
		const popup_bg = `{${colors.popup.bg}-bg}`
		const title_bg = `{${colors.title.bg}-bg}`
		const event_fg = `{${colors.event.fg}-fg}`
		const { body, author, actor } = e
		const when = dateFormat(e.when)
		switch( e.__typename ){
			case "RenamedTitleEvent":
				return `${event_fg} ✎  {bold}${actor.login}{/bold} renamed from{/} ${e.previousTitle}`
			case "IssueComment":
				const reactions = renderReactions(e.reactionGroups)
				return `\n${title_bg}{bold}${author.login}{/bold} — ${when}\n${popup_bg}${body}    \n${reactions}`
			case "AssignedEvent":
				return `${event_fg} ♙  {bold}${actor.login}{/bold} assigned {bold}${e.user.login}{/bold}`
			case "UnlabeledEvent":
				if( actor ){
					return `${event_fg} ❏  {bold}${actor.login}{/bold} removed ` + renderLabels([e.label])
				} else {
					return `${event_fg} ❏  removed ` + renderLabels([e.label])
				}
			case "LabeledEvent":
				if( actor ){
					return `${event_fg} ❏  {bold}${actor.login}{/bold} added ` + renderLabels([e.label])
				} else {
					return `${event_fg} ❏  added ` + renderLabels([e.label])
				}
			case "Commit":
				const who = e.committer.user ? e.committer.user.login : ( e.author.user ? e.author.user.login : '' )
				return `${event_fg}-○- {bold}${who}{/} committed {#000000-bg}${body.split("\n")[0]}{/}`
			case "PullRequestReview":
				return `\n${title_bg}{bold}${author.login}{/bold} review [${e.state}] — ${when}\n${popup_bg}` +
					(body.length === 0 ? "" : `${body}    \n`) +
					e.comments.nodes.map(comment => {
						if( comment.position ){
							return `{underline}${comment.path}{/underline}:${comment.position}\n${comment.body}\n`
						} else {
							return `{underline}${comment.path}{/underline} (outdated)`
						}
					}).join("\n") + "\n"
			case "CrossReferencedEvent":
				return `${event_fg} ☍  {bold}${actor.login}{/bold}` +
					` referenced {/}` +
					`${e.target.title} {#33cccc-fg}from{/} ${e.source.title}`
			case "ReferencedEvent":
				return `${event_fg} ☍  {bold}${actor.login}{/bold}` +
					` referenced {/}${e.subject.title}\n` +
					`${event_fg}-○- {#000000-bg}${e.commit.body.split("\n")[0]}{/}`
			case "ReviewRequestedEvent":
				if( e.whom ){
					return `${event_fg} ⦾  {bold}${actor.login}{/bold} requested review from{/} {bold}${e.whom.login}{/bold}`
				}
				break
			case "DeployedEvent":
				return `${event_fg} ➹  {bold}${actor.login}{/bold} deployed to ` +
					`{/}${e.deployment.environment}`
			case "MergedEvent":
				return `{#5319e7-bg} ⊱ {/} ${event_fg}{bold}${actor.login}{/bold} ` +
					`merged {/}${e.commit.abbreviatedOid} ${event_fg}into ` +
					`{/}${e.mergeRefName}`
			case "HeadRefDeletedEvent":
				return `${event_fg}{#555555-bg} ⑂ ${popup_bg} {bold}${actor.login}{/bold} deleted the ${e.headRedName} branch`
			case "HeadRefForcePushedEvent":
			default:
				return `    ${event_fg}${e.__typename}{/}`
		}
	}
	load(){
		this.model.load().then(() => {
			const popup_bg = `{${colors.popup.bg}-bg}`
			const title_bg = `{${colors.title.bg}-bg}`
			const event_fg = `{${colors.event.fg}-fg}`
			const { title, url, body, author, state, timeline } = this.model
			const reactions = renderReactions(this.model.reactionGroups)
			let c = ""
			this.box.setLabel(` {bold}{underline}${title}{/bold}{/underline} [${state}] `)
			c += `${popup_bg} \n`
			c += `${title_bg}{bold}${author}{/bold} — ${dateFormat(this.model.when)}\n${popup_bg}${body}\n${reactions}\n`
			c += timeline.map(e => {
				try {
					return this.renderEvent(e)
				} catch(err) {
					return `    ${event_fg}${e.__typename}{/}?`
				}
			}).join("\n")
			
			this.box.setContent(c)
			this.screen.render()
		}).catch(err => {
			this.screen.destroy()
			console.dir(err)
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
