const https = require('https');
const fs = require('fs');
const path = require('path');

const COMMENTS_FILE=path.join(__dirname, '..', 'source/tool/comments.json');

const github = {
    repo: 'geektutu-blog',
    owner: 'geektutu',
    basicAuth: 'YzFmZGQ0NTZhNGNhYWU1ZjdkZjA6YjI2NzQ0NTFlMjFmZWFlNTA1MjBmOTkzMzdlYzE1ZDJhZWJlNzg3OQ=='
}

const PREFIX = `/repos/${github.owner}/${github.repo}/`
const PAGING = '&sort=created&direction=desc&per_page=100'

class Comments {
    constructor() {
        this.comments = []
        this.issueMap = []
        this.obj = {}
    }

    deltaDate(old) {
        let hours = (Date.now() - new Date(old)) / 1000 / 3600

        let years = Math.floor(hours / 24 / 365)
        if (years) {
            return `${years}年前`
        }
        let months = Math.floor(hours / 24 / 30)
        if (months) {
            return `${months}月前`
        }

        let days = Math.floor(hours / 24)
        if (days) {
            return `${days}天前`
        }
        hours = Math.floor(hours)
        return `${hours}小时前`
    }

    async parse() {
        this.comments = await this.get(`issues/comments?${PAGING}`)
        console.log(`comments.length: ${this.comments.length}`)
        await this.writeComments()
    }

    async fetchIssue(issueUrl) {
        let issueApi = issueUrl.slice(issueUrl.indexOf(PREFIX) + PREFIX.length)
        if (!this.issueMap[issueApi]) {
            let issue = await this.get(issueApi)
            if (!issue.labels.find(label => label.name === 'Gitalk')) {
                return
            }
            issue.post = issue.labels.find(label => label.name.startsWith("/")).name
            issue.title = issue.title.split('|')[0].trim()
            this.issueMap[issueApi] = issue
        }
        return this.issueMap[issueApi]
    }

    async writeComments() {
        let simpleComments = {}
        for (const comment of this.comments) {
            let issue = await this.fetchIssue(comment.issue_url)
            if (!issue) {
                continue
            }
            if (issue.user.login === comment.user.login) {
                continue
            }
            if (simpleComments[issue.post]) {
                continue
            }

            simpleComments[issue.post] = {
                title: issue.title,
                url: issue.post,
                count: issue.comments,
                user: comment.user.login,
                icon: comment.user.avatar_url,
                date: this.deltaDate(comment.created_at),
                body: comment.body
                    .replace(/�/g, "")
                    .replace(/</g, " ")
                    .replace(/>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()
            }
        }
        let obj = Object.keys(simpleComments).map(key => simpleComments[key])
        fs.writeFileSync(COMMENTS_FILE, JSON.stringify(obj), { encoding: 'utf-8' });
        console.log(`write ${obj.length} success!`)
    }

    get(api) {
        let options = {
            hostname: 'api.github.com',
            path: `${PREFIX}${api}`,
            headers: { 
                'User-Agent': 'Node Https Client',
                'Authorization': `Basic ${github.basicAuth}`,
            }
        };
        console.log(`GET ${options.path}`)
        return new Promise((resolve, reject) => {
            const req = https.get(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
            });
            req.on('error', (e) => reject(e));
            req.end();
        });
    }

}


(async () => {
    client = new Comments()
    await client.parse()
})();


