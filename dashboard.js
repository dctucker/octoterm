#!/usr/bin/env node
'use strict';

const { graphql } = require('./api')

const q = `query {
	repository(name:"for-business", owner:"github"){
		issues(first:100, labels:["tracking","build & release"], states:OPEN){
			edges {
				node {
					number
					title
					comments(last:1){
						edges {
							node {
								body
								updatedAt
								url
							}
						}
					}
				}
			}
		}
	}
}`

graphql(q).then((json) => {
	json.data.repository.issues.edges.forEach((issue) => {
		const { number, title, comments } = issue.node
		let status = '?'
		let updatedAt = '?'
		if( comments.edges.length > 0 ){
			const comment = comments.edges[0].node
			const { body } = comment
			updatedAt = comment.updatedAt
			body.replace("\r","").split("\n").forEach((line) => {
				if( line.indexOf('Status: ') >=0 ){
					status = line.replace('Status: ','')
					return
				}
			})
		}
		//console.dir({ number, title, status, updatedAt })
		console.log(`${number} ${title} ${status} ${updatedAt}`)
	})
})
