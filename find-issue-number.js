const ISSUE_REGEX = /#(\d{3,})/g
const BRANCH_ISSUE_REGEX = /(\d{3,})/g

/**
 *
 * @param {Octokit} octokit https://octokit.github.io/rest.js/v18#usage
 * @param {Object} repoOwnerParams passed on all octokit calls
 * @param {Object} pull_request from the event
 *
 * @returns {Promise<string>} The issue number
 */
async function findIssueNumber({octokit, repoOwnerParams, pull_request}) {

	const { number: pull_number, title, head } = pull_request
	const prBranch = head.ref

	const search = (term, source, regex = ISSUE_REGEX) => {
		const result = regex.exec(term)
		if (result) {
			let issueNumber = result.length > 1 ? result[1] : undefined
			if (issueNumber) {
				console.log(`issue number:`, issueNumber, `found in`, source)
			}
			return issueNumber
		}
	}

	let issueNumber
	// First, Look at the commits
	const opts = {
		...repoOwnerParams,
		pull_number
	};
	console.log(`Fetching commits for ${JSON.stringify(opts)}`)
	const commits = await octokit.rest.pulls.listCommits(opts)
	const commitMessages = commits.data.map(c => c.commit.message).reverse()
	console.log('commit messages:', commitMessages)

	for(let i=0; i < commitMessages.length && !issueNumber; i++) {
		issueNumber = search(commitMessages[i], 'commits')
	}

	// Second, the PR title
	if (!issueNumber) { search(title, 'PR title') }

	// Finally, branch name
	if (!issueNumber) { issueNumber = search(prBranch, 'branch name', BRANCH_ISSUE_REGEX) }

	return issueNumber
}

module.exports = findIssueNumber

