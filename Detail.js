const { graphql } = require('./api')

class Detail {
	constructor(owner, repo, number){
		this.owner = owner
		this.repo = repo
		this.number = number
	}
	load(){
		return graphql(this.query()).then((json) => {
			this.data = json.data
		}).then(() => {
			const detail = this.data.repository.issueOrPullRequest
			const { nodes } = detail.timeline
			this.title = detail.title
			this.url = detail.url
			this.state = detail.state || ( detail.closed ? "CLOSED" : "OPEN" )

			this.commits = nodes.filter(e => e.__typename === "Commit").map((e) => {
				return {
					title: e.message,
					author: e.author.user.login,
					volume: `${e.changedFiles} files +${e.additions}-${e.deletions}`,
					when: e.committedDate,
					ci: e.status ? e.status.contexts : [],
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
		})
	}
	query() {
		return `
		query {
			repository(name:"${this.repo}", owner:"${this.owner}"){
				issueOrPullRequest(number:${this.number}){
					...prdata
						...issuedata
						... on PullRequest {
							body
							timeline(last:100) { nodes {
								__typename
									...commitdata
									...commentdata
									...refdata
							} }
						}
						... on Issue {
							body
							timeline(last:100){ nodes {
								__typename
									...commentdata
									...refdata
							} }
						}
				}
			}
		}
		fragment commitdata on Commit {
			message
			changedFiles
			additions
			deletions
			committedDate
			author {
				user {
					login
				}
			}
			status {
				state
				contexts {
					context
					description
					targetUrl
					state
				}
			}
		}
		fragment commentdata on IssueComment {
			body
			createdAt
			author {
				login
			}
			reactions(last:100) {
				nodes {
					content
					user {
						login
					}
				}
			}
		}
		fragment refdata on CrossReferencedEvent {
			target {
				__typename
					...issuedata
					...prdata
			}
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
		`
	}
}

module.exports = Detail
