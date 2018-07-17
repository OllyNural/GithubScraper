const fetch = require('node-fetch')
const octokit = require('@octokit/rest')()
const Slack = require('slack')

const config = require('./config.js')

async function start() {
    const authenticate = await octokit.authenticate(config.githubAuthenticateConfig)

    const owner = 'OllyNural'
    const repo = 'GithubScraper'
    const recursive = 1

    let commits
    try {
        commits = await octokit.repos.getCommits({owner, repo})
        let commit_sha = commits.data[0].sha
        let commit = await octokit.gitdata.getCommit({owner, repo, commit_sha})
        let tree_sha = commit.data.tree.sha
        let tree = await octokit.gitdata.getTree({owner, repo, tree_sha, recursive})
        console.log(tree)
        console.log(tree.data.tree)

    } catch (e) {
        console.log("ERROR: ")
        console.log(e)
    }
}

const isDateBefore6Months = (repo) => {
    return addYears(new Date(), -1) > new Date(repo.pushed_at)
}

const sortByDates = (a, b) => {
    return new Date(a.pushed_at) - new Date(b.pushed_at)
}

const addYears = (date, years) => {
    return date.setFullYear(date.getFullYear() + years)
}

const addMonths = (date, months) => {
    return date.setMonth(date.getMonth() + months)
}

start()
