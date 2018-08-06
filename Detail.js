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
		const reactions = `
			reactionGroups {
				content
				users { totalCount }
			}
		`
		const common_timeline = `
			...assignData
			...commentData
			...labelData
			...refData
			...renameData
			...xrefData
			...closeData
		`
		return `
		query ($repo: String!, $owner: String!, $number: Int!) {
			repository(name: $repo, owner: $owner){
				issueOrPullRequest(number: $number){
					...prData
					...issueData
					... on PullRequest {
						body
						${reactions}
						when: createdAt
						author { login }
						timeline(last:100) { nodes {
							__typename
							${common_timeline}
							...commitData
							...deleteData
							...deployData
							...mergeData
							...prreviewData
							...reviewerData
						} }
					}
					... on Issue {
						body
						${reactions}
						when: createdAt
						author { login }
						timeline(last:100){ nodes {
							__typename
							${common_timeline}
						} }
					}
				}
			}
		}
		fragment assignData on AssignedEvent {
			actor { login }
			when: createdAt
			user { login }
		}
		fragment commentData on IssueComment {
			body
			when: createdAt
			author { login }
			${reactions}
		}
		fragment commitData on Commit {
			body: message
			changedFiles
			abbreviatedOid
			additions
			deletions
			when: committedDate
			committer { user { login } }
			author { user { login } }
		}
		fragment closeData on ClosedEvent {
			actor { login }
			when: createdAt
		}
		fragment deleteData on HeadRefDeletedEvent {
			actor { login }
			when: createdAt
			headRefName
		}
		fragment deployData on DeployedEvent {
			actor { login }
			when: createdAt
			deployment { environment }
		}
		fragment issueData on Issue {
			title
			url
			closed
		}
		fragment labelData on LabeledEvent {
			actor { login }
			when: createdAt
			label { name, color }
		}
		fragment mergeData on MergedEvent {
			actor { login }
			when: createdAt
			commit { abbreviatedOid }
			mergeRefName
		}
		fragment prData on PullRequest {
			title
			url
			state
		}
		fragment prreviewData on PullRequestReview {
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
		fragment refData on ReferencedEvent {
			actor { login }
			commit {
				body: message
			}
			subject {
				__typename
				...issueData
				...prData
			}
		}
		fragment renameData on RenamedTitleEvent {
			actor { login }
			previousTitle
			when: createdAt
		}
		fragment reviewerData on ReviewRequestedEvent {
			actor { login }
			when: createdAt
			whom: requestedReviewer {
				... on User { login }
				... on Team { login: name }
			}
		}
		fragment xrefData on CrossReferencedEvent {
			actor { login }
			source {
				__typename
				...issueData
				...prData
			}
			target {
				__typename
				...issueData
				...prData
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
