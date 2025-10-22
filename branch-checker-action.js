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
	 * branch alias from the name instead of using the Issue milestone.
	 *
	 * https://github.com/SpiderStrategies/Scoreboard/pull/44997#issuecomment-1026432096
	 */
	async checkAgainstBranchName() {
		const { configFile, baseBranch, prBranch, prAuthor } = this.options
		core.info(`Looking for branch alias in PR branch name: ${prBranch}`)
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

		const issueData = await this.getIssue()

		// If no issue number could be found, skip milestone validation
		if (!issueData) {
			core.info('No issue number found in commit messages, PR title, or branch name. Skipping milestone validation.')
			return
		}

		const { issueNumber, issueResponse } = issueData

		if (!issueResponse.data.milestone) {
			await this.fail(`Issue #${issueNumber} is missing a milestone, can't validate the base branch.`)
		} else {
			await this.validateBranch(issueResponse, issueNumber)
		}
	}

	async getIssue() {
		const { pull_request } = this.options

		try {
			const issueNumber = await findIssueNumber({action: this, pull_request})

			console.log('Determined issue number is "' + issueNumber + '"')

			// If no issue number found, return null to skip milestone validation
			if (!issueNumber) {
				return null
			}

			// https://octokit.github.io/rest.js/v18#issues
			const issueResponse = await this.execRest(
				(api, opts) => api.issues.get(opts),
				{issue_number: issueNumber},
				'Get Issue')

			return {
				issueNumber,
				issueResponse
			}
		} catch (error) {
			// If findIssueNumber fails (e.g., PR not accessible), skip milestone validation
			core.info(`Unable to fetch issue information: ${error.message}. Skipping milestone validation.`)
			return null
		}
	}

	async validateBranch(issueResponse, issueNumber) {

		const { configFile, baseBranch, prAuthor } = this.options
		const { branchNameByMilestoneNumber } = configReader(configFile)
		const {
			title,
			number: issueMilestoneNumber
		} = issueResponse.data.milestone
		const issueBranch = branchNameByMilestoneNumber[issueMilestoneNumber]
		await this.checkMilestone(issueBranch, prAuthor, issueNumber, baseBranch, title)
	}

	async checkMilestone(issueBranch, prAuthor, issueNumber, baseBranch, title) {
		if (!issueBranch) {
			const msg = `${prAuthor} Did you use the correct issue number in your commit message?` +
				` There was no milestone found for #${issueNumber}`
			await this.fail(msg)
		} else if (baseBranch != issueBranch) {
			const msg = `${prAuthor} it looks like this pull request is against the wrong branch.` +
				` It should probably be \`${issueBranch}\` instead of \`${baseBranch}\``
			await this.fail(msg)
		} else {
			core.info(`Success: PR baseBranch '${baseBranch}' matches issue #${issueNumber} ${title} branch '${issueBranch}'`)
		}
	}

	async fail(body) {

		const { prNumber } = this.options

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