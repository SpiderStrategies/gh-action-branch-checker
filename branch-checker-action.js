// https://github.com/actions/toolkit/tree/main/packages/core#annotations
const core = require('@actions/core')

const { findIssueNumber, configReader, BaseAction } = require('gh-action-components')

class BranchCheckerAction extends BaseAction {

	constructor(options = {}) {
		super()
		this.options = options
	}

	async runAction() {
		await this.checkAgainstBranchName()
		await this.checkAgainstIssueMilestone()
	}

	/**
	 * If the branch is one that resolves merge conflicts, extract the target
	 * branch alias from the name isntead of using the Issue milestone.
	 *
	 * https://github.com/SpiderStrategies/Scoreboard/pull/44997#issuecomment-1026432096
	 */
	async checkAgainstBranchName() {
		const { configFile, baseBranch, prBranch, prAuthor } = this.options
		const regexResult = /issue-\d*-pr-\d*-conflicts-([\w|-]*)$/g.exec(prBranch)
		const branchAlias = (regexResult && regexResult.length > 1) ? regexResult[1] : undefined
		if (branchAlias) {
			this.done = true
			const { branchByAlias } = configReader(configFile)
			const { name } = branchByAlias[branchAlias] || {}
			if (baseBranch != name) {
				const msg = `${prAuthor} This pull request is against the wrong branch. It must be \`${name}\` instead of \`${baseBranch}\``
				await this.fail(msg)
			} else {
				core.info(`Success: PR baseBranch '${baseBranch}' matches PR conflict resolution branch '${prBranch}'`)
			}
		}
	}

	async checkAgainstIssueMilestone() {

		if (this.done) return

		const { issueNumber, issueResponse } = await this.getIssue()

		if (!issueResponse.data.milestone) {
			await this.fail(`Issue #${issueNumber} is missing a milestone, can't validate the base branch.`)
		} else {
			await this.validateBranch(issueResponse, issueNumber)
		}
	}

	async getIssue() {
		const { pull_request } = this.options
		const issueNumber = await findIssueNumber({action: this, pull_request})

		// https://octokit.github.io/rest.js/v18#issues
		const issueResponse = await this.execRest(
			(api, opts) => api.issues.get(opts),
			{issue_number: issueNumber},
			'Get Issue')

		return {
			issueNumber,
			issueResponse
		}
	}

	async validateBranch(issueResponse, issueNumber) {

		const configFile = core.getInput('config-file', { required: true });
		const { branchNameByMilestoneNumber } = configReader(configFile)
		const {
			title,
			number: issueMilestoneNumber
		} = issueResponse.data.milestone
		const issueBranch = branchNameByMilestoneNumber[issueMilestoneNumber]

		if (baseBranch != issueBranch) {
			const msg = `${prAuthor} it looks like this pull request is against the wrong branch.` +
				` It should probably be \`${issueBranch}\` instead of \`${baseBranch}\``
			await this.fail(msg)
		} else {
			core.info(`Success: PR baseBranch '${baseBranch}' matches issue #${issueNumber} ${title} branch '${issueBranch}'`)
		}
	}

	async fail(body) {

		// Adds a regular comment to a pull request timeline instead of the
		// diff view
		await this.execRest(
			(api, opts) => api.issues.createComment(opts),
			{issue_number: prNumber, body},
			'Create PR comment')

		// https://github.com/actions/toolkit/tree/main/packages/core#exit-codes
		core.warning(body);
	}
}

module.exports = BranchCheckerAction