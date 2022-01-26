// https://github.com/actions/toolkit/tree/main/packages/core#annotations
const core = require('@actions/core')
const github = require('@actions/github')

const { findIssueNumber } = require('gh-action-components')

const context = github.context;
const { repository, pull_request } = context.payload
const octokit = github.getOctokit(core.getInput('repo-token'))
const repoOwnerParams = {
	owner: repository.owner.login,
	repo: repository.name
}

async function run() {
	const expectedMilestoneNumber = core.getInput('milestone-number', { required: true });
	core.info(`expected milestoneNumber: ${expectedMilestoneNumber}`)

	const issueNumber = await findIssueNumber({
		octokit,
		repoOwnerParams,
		pull_request
	})

	// https://octokit.github.io/rest.js/v18#issues
	const issueResponse = await octokit.rest.issues.get({
		...repoOwnerParams,
		issue_number: issueNumber
	})

	const { title, number:actualMilestoneNumber } = issueResponse.data.milestone

	if (expectedMilestoneNumber != actualMilestoneNumber) {
		// https://github.com/actions/toolkit/tree/main/packages/core#exit-codes
		core.setFailed(`Milestone ${title} is expected for issue #${issueNumber}`);
	} else {
		core.info(`Milestone ${title} matches issue #$issueNumber}`)
	}
}

return run()
	.catch(err => core.error(err))