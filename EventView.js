const { colors } = require('./storage').getItem('options')
const { dateFormat, getContrastColor, renderLabels } = require('./helpers')
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
	return `{#000000-bg}{#ccbb00-fg}${commit.abbreviatedOid} {#aaaaaa-fg}${commit.body.split("\n")[0]}{/}`
}


class EventView {
	constructor(event){
		for( var k in event ){
			this[k] = event[k]
		}
		this.when = dateFormat(this.when)
		this.who = this.login('actor')
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
	IssueComment() {
		const reactions = renderReactions(this.reactionGroups)
		return `\n{/}` +
			`${title_bg}{bold}${this.login('author')}{/bold} — ${this.when}\n` +
			`${popup_bg}${this.body}    \n` +
			`${reactions}`
	}
	PullRequestReview() {
		const comments = this.comments.nodes.map(comment => {
			if( comment.position ){
				return `{underline}${comment.path}{/underline}:${comment.position}\n` +
					`${comment.body}\n`
			} else {
				return `{underline}${comment.path}{/underline} (outdated)`
			}
		}).join("\n")
		return `\n{/}` +
			`${title_bg}{bold}${this.login('author')}{/bold} review [${this.state}] — ${this.when}\n` +
			`${popup_bg}${this.body}\n` +
			`${comments}\n`
	}
	Commit() {
		this.who = this.login('committer','author')
		return this.preamble('-○-') + `committed ` + renderCommit(this)
	}
	ClosedEvent() {
		return this.preamble('{white-fg}{red-bg} ⊘ {/red-bg}{/white-fg}') + `closed this`
	}
	RenamedTitleEvent(){
		return this.preamble(' ✎ ') + `renamed from{/} ${this.previousTitle}`
	}
	AssignedEvent() {
		return this.preamble(' ♙ ') + `assigned {bold}${this.login('user')}{/bold}`
	}
	UnlabeledEvent() {
		return this.preamble(' ❏ ') + `removed ` + renderLabels([this.label])
	}
	LabeledEvent() {
		return this.preamble(' ❏ ') + `added ` + renderLabels([this.label])
	}
	CrossReferencedEvent() {
		return this.preamble(' ☍ ') + `referenced {/}${this.target.title} ` +
			`{#33cccc-fg}from{/} ${this.source.title}`
	}
	ReferencedEvent() {
		return this.preamble(' ☍ ') + `referenced {/}${this.subject.title}\n` +
			`${event_fg}-○- ` + renderCommit(this.commit)
	}
	ReviewRequestedEvent() {
		return this.preamble(' ⦾ ') + `requested review from{/} {bold}${this.login('whom')}{/bold}`
	}
	DeployedEvent() {
		return this.preamble(' ➹ ') + `deployed to{/} ${this.deployment.environment}`
	}
	MergedEvent() {
		return `{#5319e7-bg} ⊱ {/} ${event_fg}{bold}${this.login('actor')}{/bold} ` +
			`merged {/}${this.commit.abbreviatedOid} ${event_fg}into ` +
			`{/}${this.mergeRefName}`
	}
	HeadRefDeletedEvent() {
		return `${event_fg}{#555555-bg} ⑂ ${popup_bg} {bold}${this.login('actor')}{/bold} deleted the ${this.headRedName} branch`
	}
}

module.exports = {
	EventView,
	renderReactions,
}
