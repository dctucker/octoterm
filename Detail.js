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
			this.body = detail.body
			this.when = detail.when
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
		query {
			repository(name:"${this.repo}", owner:"${this.owner}"){
				issueOrPullRequest(number:${this.number}){
					...prdata
						...issuedata
						... on PullRequest {
							body
							when: createdAt
							author { login }
							timeline(last:100) { nodes {
								__typename
								...commitdata
								...prreviewdata
								...reviewerdata

								...commentdata
								...refdata
								...renamedata
								...labeldata
								...assigndata
							} }
						}
						... on Issue {
							body
							when: createdAt
							author { login }
							timeline(last:100){ nodes {
								__typename
								...commentdata
								...refdata
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
			author {
				login
			}
			reactionGroups {
				content
				users {
					totalCount
				}
			}
		}
		fragment refdata on CrossReferencedEvent {
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
		fragment reviewerdata on ReviewRequestedEvent {
			actor { login }
			when: createdAt
			whom: requestedReviewer {
				__typename
			}
		}
		fragment assigndata on AssignedEvent {
			actor { login }
			when: createdAt
			user { login }
		}
		fragment labeldata on LabeledEvent {
			actor {login}
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
			author {
				login
			}
			when: createdAt
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
