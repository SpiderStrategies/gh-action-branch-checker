// https://github.com/actions/toolkit/tree/main/packages/core#annotations
const core = require('@actions/core')
const github = require('@actions/github')

const { findIssueNumber, configReader, BaseAction } = require('gh-action-components')

const context = github.context;
const { pull_request } = context.payload
const { number: prNumber, base, user } = pull_request
const baseBranch = base.ref
const prAuthor = '@' + user.login

class BranchCheckerAction extends BaseAction {

	async runAction() {
		const configFile = core.getInput('config-file', { required: true });
		const issueNumber = await findIssueNumber({action: this, pull_request})
		const { branchNameByMilestoneNumber } = configReader(configFile)

		// https://octokit.github.io/rest.js/v18#issues
		const issueResponse = await this.execRest(
			(api, opts) => api.issues.get(opts),
			{issue_number: issueNumber},
			'Get Issue')

		const { title, number: issueMilestoneNumber } = issueResponse.data.milestone
		const issueBranch = branchNameByMilestoneNumber[issueMilestoneNumber]

		if (baseBranch != issueBranch) {
			await this.fail(issueBranch)
		} else {
			core.info(`Success: PR baseBranch '${baseBranch}' matches issue #${issueNumber} ${title} branch '${issueBranch}'`)
		}
	}

	async fail(issueBranch) {
		const msg = `${prAuthor} it looks like this pull request is against the wrong branch.` +
			` It should probably be ${issueBranch} instead of ${baseBranch}`

		// Adds a regular comment to a pull request timeline instead of the
		// diff view
		await this.execRest(
			(api, opts) => api.issues.createComment(opts),
			{issue_number: prNumber, body: msg},
			'Create PR comment')

		// https://github.com/actions/toolkit/tree/main/packages/core#exit-codes
		core.setFailed(msg);
	}
}

return new BranchCheckerAction().run()