var githubIssues = [];
var githubUsername, githubPassword, githubUser, githubRepo, watchersNames;

var ALL_ENVS = [
    ['https://ttlc.intuit.com', 'tax'],
    ['https://community.intuit.com', 'shared'],
    ['https://turbotax-community-e2e.intuit.com', 'tax-e2e'],
    ['https://community.e2e.lc.a.intuit.com', 'shared-e2e'],
    ['https://foo.qa.lc.a.intuit.com', 'qa']
];

var commitsStatus;
var myVar;

function JiraGithub(){
    this.initVariables = function(response){
        githubUsername = response.githubUsername;
        githubPassword = response.githubPassword;
        githubUser = response.githubUser;
        githubRepo = response.githubRepo;
    }

    this.setIntervalChangeGithubPage = function(){
        setInterval(function() {
            if (window.location.href.indexOf('https://github.com/live-community/live_community/pull/') == 0){
                jiraGithub.changeGithubPage();
            }
        }, 3000);

        this.changeGithubPage();
    }

    this.changeGithubPage = function (){
        if($('.js-issue-title').text().indexOf('LCP-') > 0) {
            var issueTitle = $('.js-issue-title').text();
            var issueTitleNoLcp = issueTitle.substring(0, issueTitle.indexOf('LCP-'));
            var lcp = issueTitle.substring(issueTitle.indexOf('LCP-'));
            $('.js-issue-title').text(issueTitleNoLcp);
            $('.js-issue-title').append(issueLinkHtmlOnGithub(lcp, '').text(lcp));
        }
    }

    this.getGithubIssues = function(){
        if (githubUsername.length > 0 && githubPassword.length > 0 && githubUser.length > 0 && githubRepo.length > 0) {
            var github = new window.Github({
                username: githubUsername,
                password: githubPassword,
                auth: "basic"
            });
            var issues = github.getIssues(githubUser, githubRepo); // 'live-community', 'live_community'
            githubIssues = [];
            issues.list('open', function(err, cbIssues) {
                githubIssues = cbIssues;
            });

            var repo = github.getRepo('live-community', 'live_community');
            repo.listTags(function(_, tags){
                var tmp = getBaseRC(tags);
                var baseSHA = tmp[0];
                var tags = tmp[1];
                repo.getRef('heads/master', function(err, headSHA) {
                    repo.compare(baseSHA, headSHA, function(err, commits){
                        console.log('Base (Oldest) SHA'  + baseSHA + '--- Head SHA' + headSHA);
                        commitsStatus = new CommitsStatus(baseSHA, headSHA);
                        matchEnvsWithCommits(repo, commits, tags, baseSHA);
                    });
                });

                myVar = setInterval(checkCommitsStatus, 1000);
            });
        }
    }

    this.addPullRequestLabel = function(issueKey, elIssue){
        var prLabel = '';
        if (githubIssues.length > 0){
            prLabel = this.pullRequestLabel(issueKey, elIssue);
            addLabelTo(elIssue, prLabel, 'bottom-right');
        }
        return prLabel.length > 0;
    }

    this.pullRequestLabel = function(issueKey, elIssue){
        var pr = pullRequest(issueKey);
        if (pr == null){
            return "";
        }

        // var psUrl = pr['url'];
        var psDaysOld = Math.round(((new Date) - (new Date(pr['created_at']))) / (1000 * 60 * 60 * 24));
        var psLabel = '';

        for(var i=0; i < pr['labels'].length; i++) {
            psLabel += pr['labels'][i]['name'] + ' ';
        }

        var prInfo = psLabel + ' (PR: ' + psDaysOld + ' days)';

        if (psDaysOld > 10 && psDaysOld <= 20) {
            var imgURL = chrome.extension.getURL('images/web.png');
            elIssue.css('background-image', 'url("' + imgURL + '")');
        }
        else if (psDaysOld > 21) {
            var imgURL = chrome.extension.getURL('images/web2.png');
            elIssue.css('background-image', 'url("' + imgURL + '")');
        }

        var img = $('<img />').attr({
            src: chrome.extension.getURL("images/github.png"),
            width:'16',
            height:'15',
            class: 'github-icon'
        })
        var anchor = $('<a />').attr({
            href: "javascript:void(0);",
            onclick: "window.open('" + pr['pull_request']['html_url'] + "')",
            target: "_blank"
        });

        elIssue.find('.ghx-key').append(anchor.append(img));

        return prInfo;
    }
}

function checkCommitsStatus(){
    console.log('checking......');
    if (commitsStatus && commitsStatus.envStatus.length == ALL_ENVS.length + 1){
        console.log('DONE');
        console.log(commitsStatus.envStatus);
        clearInterval(myVar);

        var lcps = Object.keys(commitsStatus.lcps);
        for(var i=0;i<lcps.length; i++){
            var envNames = '';
            commitsStatus.lcps[lcps[i]].forEach(function(envName){
                envNames = envNames + ' ' + envName;
            });
            var key = 'LCP-' + lcps[i];
            var elIssue = $("div[data-issue-key='" + key + "'].ghx-issue, div[data-issue-key='" + key + "'].ghx-issue-compact").first();

            addLabelTo(elIssue, envNames, 'top-left');
        }
    }
}

function CommitsStatus(baseSHA, headSHA){
    this.baseSHA = baseSHA;
    this.headSHA = headSHA;
    this.envStatus = [];
    this.addEnvStatus = function(obj){
        this.envStatus[this.envStatus.length] = obj;
    }
    this.lcps = {};
    this.addLCP = function(lcp, envName){
        if(this.lcps[lcp] === undefined){
            this.lcps[lcp] = new Set();
        }
        this.lcps[lcp].add(envName);
    }
    this.removeLCP = function(lcp, envName){
        if(this.lcps[lcp]){
            this.lcps[lcp].delete(envName);
        }
    }
}

function EnvStatus(url, name, sha, tag){
    this.url = url;
    this.name = name;
    this.sha = sha;
    this.tag = tag;
    this.lcps = [];
}

function getBaseRC(tags){
    var today = new Date();
    var twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate()-15);

    var rcDate, rcSha;
    for(var i=0; i<tags.length; i++){
        var found = tags[i]['name'].match(/RC-(\d*)-(\d*)-(\d*)(\.\d)*/);
        rcDate = (new Date(found[1] , found[2] - 1 , found[3]));
        // console.log(rcDate + (twoWeeksAgo > rcDate));
        if(twoWeeksAgo > rcDate) {
            rcSha = tags[i]['commit']['sha']
            break;
        }
    }

    return [rcSha, tags];
}

function matchEnvsWithCommits(repo, commits, tags, baseSHA){
    console.log('----- MASTER -----');
    var lcps = envLCPs('', '', '', commits);

    envStatus = new EnvStatus('master', '', '', '');
    envStatus.lcps = lcps;
    commitsStatus.addEnvStatus(envStatus);
    printLCPs(lcps);

    var topRC = tags[0]['commit']['sha'];

    for(var i=0; i < ALL_ENVS.length; i++){
        var url = ALL_ENVS[i][0];
        var name = ALL_ENVS[i][1];

        fetchEnvSHA(url, name, function(url, name, sha){
            repo.compare(baseSHA, sha, function(err, commits){

                var envTag = findTagForSHA(sha, tags)
                console.log('-----------------------------------------------------');
                console.log('Name ' + name);
                console.log('Has SHA ' + sha);
                console.log('Has Tag ' + envTag);

                envStatus = new EnvStatus(url, name, sha, envTag);

                if(sha != ''){
                    var lcps = envLCPs(sha, topRC, name, commits);
                    envStatus.lcps = lcps;
                    printLCPs(lcps);
                }

                commitsStatus.addEnvStatus(envStatus);
            });
        });
    }
}

function findTagForSHA(sha, tags){
    for(var i=0; i<tags.length; i++){
        if (sha == tags[i]['commit']['sha']){
            return tags[i]['name'];
        }
    }
    return '';
}

function envLCPs(envSHA, topRC, envName, commits){
    var mergedLCPs = [];
    var sha = commits['base_commit']['sha']; // The oldest commit

    if(sha != envSHA){
        storeMergedCommit(commits['base_commit']['commit'], sha, envName, mergedLCPs);
    }

    if(sha == topRC){
        mergedLCPs[mergedLCPs.length] = {'lcp' : 'RC', 'date': '-----', 'sha': '-----'}
    }

    for(var i=0; i < commits['commits'].length; i++){
        sha = commits['commits'][i]['sha'];
        if(sha == topRC){
            mergedLCPs[mergedLCPs.length] = {'lcp' : 'RC', 'date': '-----', 'sha': '-----'}
        }

        if(sha == envSHA){ // HIT THE ENV SHA - STOP HERE
            storeMergedCommit(commits['commits'][i]['commit'], sha, envName, mergedLCPs);
            return mergedLCPs;
        }

        if(sha != envSHA){
            storeMergedCommit(commits['commits'][i]['commit'], sha, envName, mergedLCPs);
        }
    }
    return mergedLCPs;
}

function storeMergedCommit(commit, sha, envName, mergedLCPs){
    var msg = commit['message'];
    var isPR = isPullRequest(msg);
    var lcp = extractLCP(msg);
    var revertedLcp = extractRevertedLCP(msg);

    if(revertedLcp){
        console.log('Found a Reverted Lcp ' + revertedLcp);
        for(var i=0; i < mergedLCPs.length; i++){
            if(mergedLCPs[i]['lcp'] == revertedLcp){
                console.log('Reverting ' + revertedLcp);
                commitsStatus.removeLCP(revertedLcp, envName);
                mergedLCPs.splice(i, 1);
                return;
            }
        }
    }
    else {
        if(lcp) {
            mergedLCPs[mergedLCPs.length] = {'lcp': lcp, 'date' : commit['author']['date'], 'sha' : sha, 'message' : ''};
            commitsStatus.addLCP(lcp, envName);
        }
        else if(isPR){
            var tmp = msg.split('from live-community/')[1].split('\n\n');
            var info = 'branch: ' + tmp[0] + ' : ' + tmp[1];
            mergedLCPs[mergedLCPs.length] = {'lcp': '', 'date' : commit['author']['date'], 'sha' : sha, 'message' : info};
        }
    }
}

function isPullRequest(message){
    var found = message.match(/Merge pull request/);
    return (found && found.length > 0);
}

function extractLCP(message){
    var found = message.match(/Merge pull request[\S\s]*LCP-(\d*)/);
    if(found && found.length == 2){
        return found[1];
    }
    return null;
}

function extractRevertedLCP(message){
    var found = message.match(/Merge pull request[\S\s]*Revert.*LCP-(\d*)/);
    if(found && found.length == 2){
        return found[1];
    }
    return null;
}

function printLCPs(lcps, envStatus){
    for(var i=0; i<lcps.length; i++){
        console.log(lcps[i]['lcp'] + ' ' + lcps[i]['date'] + ' ' + lcps[i]['sha'] + ' '  + lcps[i]['message']);
    }
}

function fetchEnvSHA(url, name, cb) {
    $.get(url + '/status', function(data){
        var found = data.match(/Version:\s*(.*)[\s|\S]Database/);
        cb(url, name, found[1]);
    }).fail(function() {
            console.log("error " + url);
            cb('', '', '');
        });
}

function showAllCommits(commits){
    console.log(commits['base_commit']['sha']);
    for(var i=0; i < commits['commits'].length; i++){
        console.log(commits['commits'][i]['sha'] + commits['commits'][i]['commit']['author']['date']);
    }
}
