const tap = require('tap')

const BranchCheckerAction = require('../branch-checker-action')

class StubbedChecker extends BranchCheckerAction {
	async fail(body) {
		this.failMsg = body
	}
	async getIssue() {
		return {
			data: {

			}
		}
	}
}

// checkAgainstBranchName

const options = {
	configFile: 'test/test-config.json',
	pull_request: {},
	prBranch: 'issue-44915-pr-44995-conflicts-2021-sp',
	prAuthor: '@joe',
	prNumber: 1
}

tap.test(`Fail from branch name`, async t => {
	const action = new StubbedChecker({
		...options,
		baseBranch: 'release-2022'
	})
	await action.checkAgainstBranchName()
	t.ok(action.done)
	t.equal(action.failMsg,
		'@joe This pull request is against the wrong branch. It must be `release-2021-commercial-sp` instead of `release-2022`')
})

tap.test(`Pass from branch name`, async t => {
	const action = new StubbedChecker({
		...options,
		baseBranch: 'release-2021-commercial-sp'
	})
	await action.checkAgainstBranchName()
	t.ok(action.done)
	t.notOk(action.failMsg)
})