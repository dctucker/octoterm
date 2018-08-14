const { colors } = require('../components/storage').getItem('options')
const { escape, dateFormat, getContrastColor, renderLabels } = require('../components/helpers')
const popup_bg = `{${colors.popup.bg}-bg}`
const title_bg = `{${colors.title.bg}-bg}`
const event_fg = `{${colors.event.fg}-fg}`

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

const renderCommit = (commit) => {
	return `{#000000-bg}{#ccbb00-fg}${commit.abbreviatedOid} {#aaaaaa-fg}` +
		`${escape(commit.body.split("\n")[0])}` +
		`{/}`
}

class EventView {
	constructor(event){
		for( var k in event ){
			this[k] = event[k]
		}
		this.when = dateFormat(this.when)
		this.who = this.login('actor')
		if( this.body ){
			this.body = escape(this.body)
		}
	}
	render(){
		const t = this.__typename
		if( typeof this[t] === "function" ){
			try {
				return this[t]()
			} catch(err) {
				return this.unknown() + '?'
			}
		} else {
			return this.unknown()
		}
	}
	unknown(){
		return `${event_fg}    ${this.__typename}{/}`
	}
	preamble(icon){
		return `${event_fg}${icon} {bold}${this.who}{/bold} `
	}
	login(...whos){
		for( var w in whos ){
			const who = whos[w]
			if( this[who] ){
				if( this[who].login ){
					return this[who].login
				} else if( this[who].user ){
					if( this[who].user.login ){
						return this[who].user.login
					}
				}
			}
		}
		return ""
	}
	rwhen() {
		return `{|}${event_fg}${this.when}`
	}
	IssueComment() {
		const reactions = renderReactions(this.reactionGroups)
		return `\n{/}` +
			`${title_bg}{bold}${this.login('author')}{/bold}` + this.rwhen() +
			`\n{/}${popup_bg}${this.body}` +
			`\n${reactions}`
	}
	PullRequestReview() {
		const comments = this.comments.nodes.map(comment => {
			if( comment.position ){
				const body = escape(comment.body)
				const rwhen = `{|}${event_fg}${dateFormat(comment.when)}`
				return `{underline}${comment.path}{/underline}:${comment.position}` + rwhen +
					`\n{/}${body}\n`
			} else {
				return `{underline}${comment.path}{/underline} (outdated)`
			}
		}).join("\n")
		return `\n{/}` +
			`${title_bg}{bold}${this.login('author')}{/bold} review [${this.state}]` + this.rwhen() +
			`\n{/}${popup_bg}${this.body}` +
			`\n${comments}\n`
	}
	Commit() {
		this.who = this.login('committer','author')
		return this.preamble('-○-') + `committed ` + renderCommit(this) + this.rwhen()
	}
	ClosedEvent() {
		return this.preamble('{white-fg}{red-bg} ⊘ {/red-bg}{/white-fg}') + `closed this` + this.rwhen()
	}
	RenamedTitleEvent(){
		return this.preamble(' ✎ ') + `renamed from{/} ${this.previousTitle}` + this.rwhen()
	}
	AssignedEvent() {
		return this.preamble(' ♙ ') + `assigned {bold}${this.login('user')}{/bold}` + this.rwhen()
	}
	UnlabeledEvent() {
		return this.preamble(' ❏ ') + `removed ` + renderLabels([this.label]) + this.rwhen()
	}
	LabeledEvent() {
		return this.preamble(' ❏ ') + `added ` + renderLabels([this.label]) + this.rwhen()
	}
	CrossReferencedEvent() {
		return this.preamble(' ☍ ') + `referenced {/}${this.target.title} ` +
			`{#33cccc-fg}from{/} ${this.source.title}` + this.rwhen()
	}
	ReferencedEvent() {
		return this.preamble(' ☍ ') + `referenced {/}${this.subject.title}` + this.rwhen() +
			`\n${event_fg}-○- ` + renderCommit(this.commit)
	}
	ReviewRequestedEvent() {
		return this.preamble(' ⦾ ') + `requested review from{/} {bold}${this.login('whom')}{/bold}` + this.rwhen()
	}
	DeployedEvent() {
		return this.preamble(' ➹ ') + `deployed to{/} ${this.deployment.environment}` + this.rwhen()
	}
	MergedEvent() {
		return `{#5319e7-bg} ⊱ {/} ${event_fg}{bold}${this.login('actor')}{/bold} ` +
			`merged {/}${this.commit.abbreviatedOid} ${event_fg}into ` +
			`{/}${this.mergeRefName}` + this.rwhen()
	}
	HeadRefDeletedEvent() {
		return `${event_fg}{#555555-bg} ⑂ ${popup_bg} {bold}${this.login('actor')}{/bold} deleted the ${this.headRedName} branch` + this.rwhen()
	}
}

module.exports = {
	EventView,
	renderReactions,
}
