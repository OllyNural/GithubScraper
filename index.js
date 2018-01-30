const fetch = require('node-fetch')
const GitHubApi = require('github')
const Slack = require('slack')

const config = require('./config.js')

//https://www.npmjs.com/package/github
const github = new GitHubApi()
const slack = new Slack({token: config.slackAuthenticationConfig.token})

async function start() {
    // Authenticate
    const authenticate = await github.authenticate(config.githubAuthenticateConfig)
    // Get all the Repos belonging to ANDigital
    const result = await github.repos.getForOrg({org: 'ANDigital', per_page: 100})
    // Sort the results by date - oldest -> newest and keep oldest ones, add color
    let repos = result.data.filter(repo => isDateBefore6Months(repo)).sort(sortByDates).map(repo => setFieldColor(repo))
    // Send the filtered results to slack!
    sendToSlack(repos)
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

// Get date diff and roughly do maths to get how old in months
const setFieldColor = (repo) => {
    let diff = (new Date().getTime() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (diff > 24) {
        repo.last_date_color = 'danger' 
    } else if (diff > 18) {
        repo.last_date_color = 'warning'
    } else {
        repo.last_date_color = 'good'
    }
    return repo
}

const formatMessages = (repos) => {
    let reposToSend = {attachments: []}
    for (let repo of repos) {
        reposToSend.attachments.push({
            title: repo.full_name,
            title_link: repo.html_url,
            color: repo.last_date_color,
            fields: [
                {
                    title: 'Last pushed',
                    value: new Date(repo.pushed_at).toDateString(),
                    short: true
                }
            ]
        })
    }
    return reposToSend
}

async function sendToSlack(repos) {
    // True to send a pm to the username in config
    // False to send a message to the channel in config
    let sendPM = false
    // Send IM instead of channel
    let users = await slack.users.list()
    let theUser = users.members.filter(user => user.name === config.slackAuthenticationConfig.channel)[0]

    const placeToSend = sendPM ? theUser.id : config.slackConfig.channel
    
    let formattedMessages = formatMessages(repos)
    slack.chat.postMessage({text: 'List of recently unused github projects', attachments: reposToSend.attachments, channel: placeToSend, username: 'Github bot'})
}

start()
