const { graphql } = require('./api')
const store = require('./storage')

class Detail {
	constructor(owner, repo, number){
		this.owner = owner
		this.repo = repo
		this.number = number
	}
	load(){
		const query = this.query()
		const variables  = {
			owner: this.owner,
			repo: this.repo,
			number: parseInt(this.number),
		}
		store.setItem('graphql', { query, variables })

		return graphql(query, variables).then((json) => {
			store.setItem('detail', json)
			this.data = json.data
			this.errors = json.errors
			if( this.data === null ){
				throw this.errors
			}
		}).then(() => {
			const detail = this.data.repository.issueOrPullRequest
			const { nodes } = detail.timeline
			this.title = detail.title
			this.url = detail.url
			this.body = detail.body
			this.when = detail.when
			this.reactionGroups = detail.reactionGroups
			this.author = detail.author.login
			this.state = detail.state || ( detail.closed ? "CLOSED" : "OPEN" )

			/*
			this.commits = nodes.filter(e => e.__typename === "Commit").map((e) => {
				return {
					title: e.message,
					author: e.author.user.login,
					volume: `${e.changedFiles} files +${e.additions}-${e.deletions}`,
					when: e.committedDate,
					//ci: e.status ? e.status.contexts : [],
				}
			})
			this.comments = nodes.filter(e => e.__typename === "IssueComment").map((e) => {
				return {
					title: e.body,
					author: e.author.login,
					when: e.createdAt,
					reactions: e.reactions.nodes,
				}
			})
			*/
			this.timeline = detail.timeline.nodes
		})
	}
	query() {
		return `
		query ($repo: String!, $owner: String!, $number: Int!) {
			repository(name: $repo, owner: $owner){
				issueOrPullRequest(number: $number){
					...prdata
						...issuedata
						... on PullRequest {
							body
							reactionGroups {
								content
								users { totalCount }
							}
							when: createdAt
							author { login }
							timeline(last:100) { nodes {
								__typename
								...commitdata
								...prreviewdata
								...reviewerdata

								...commentdata
								...refdata
								...xrefdata
								...renamedata
								...labeldata
								...assigndata
							} }
						}
						... on Issue {
							body
							reactionGroups {
								content
								users { totalCount }
							}
							when: createdAt
							author { login }
							timeline(last:100){ nodes {
								__typename
								...commentdata
								...refdata
								...xrefdata
								...renamedata
								...labeldata
								...assigndata
							} }
						}
				}
			}
		}
		fragment commentdata on IssueComment {
			body
			when: createdAt
			author { login }
			reactionGroups {
				content
				users { totalCount }
			}
		}
		fragment xrefdata on CrossReferencedEvent {
			actor { login }
			source {
				__typename
				...issuedata
				...prdata
			}
			target {
				__typename
				...issuedata
				...prdata
			}
		}
		fragment refdata on ReferencedEvent {
			actor { login }
			commit {
				body: message
			}
			subject {
				__typename
				...issuedata
				...prdata
			}
		}
		fragment reviewerdata on ReviewRequestedEvent {
			actor { login }
			when: createdAt
			whom: requestedReviewer {
				... on User { login }
				... on Team { login: name }
			}
		}
		fragment assigndata on AssignedEvent {
			actor { login }
			when: createdAt
			user { login }
		}
		fragment labeldata on LabeledEvent {
			actor { login }
			when: createdAt
			label { name, color }
		}
		fragment renamedata on RenamedTitleEvent {
			actor { login }
			previousTitle
			when: createdAt
		}
		fragment prdata on PullRequest {
			title
			url
			state
		}
		fragment issuedata on Issue {
			title
			url
			closed
		}
		fragment commitdata on Commit {
			body: message
			changedFiles
			additions
			deletions
			when: committedDate
			author { user { login } }
		}
		fragment prreviewdata on PullRequestReview {
			body
			author { login }
			when: createdAt
			state
			comments(last:100){
				nodes {
					body
					path
					position
				}
			}
		}
		`
			/*
			status {
				state
				contexts {
					context
					description
					targetUrl
					state
				}
			}
			*/
	}
}

module.exports = Detail
