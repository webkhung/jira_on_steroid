var githubIssues = [];
var githubUsername, githubPassword, githubUser, githubRepo, watchersNames;

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
            $('.js-issue-title').append(issueLinkHtml(lcp, '').text(lcp));
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
