const BranchCheckerAction = require('./branch-checker-action')
const github = require('@actions/github')
const core = require('@actions/core')

const context = github.context;
const { pull_request } = context.payload
const { number: prNumber, base, head, user } = pull_request

const configFile = core.getInput('config-file', { required: true });

return new BranchCheckerAction({
	configFile,
	pull_request,
	baseBranch: base.ref,
	prBranch: head.ref,
	prAuthor: '@' + user.login,
	prNumber
}).run()