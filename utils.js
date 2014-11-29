function hexToRgb(hex) {
    var result;
    result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return parseInt(result[1], 16) + ',' + parseInt(result[2], 16) + ',' + parseInt(result[3], 16);
    }
}

function stringToColour(str) {
    for (var i = 0, hash = 0; i < str.length; hash = str.charCodeAt(i++) + ((hash << 5) - hash));
    for (var i = 0, colour = "#"; i < 3; colour += ("00" + ((hash >> i++ * 8) & 0xFF).toString(16)).slice(-2));
    return colour;
}

function toDate(string){
    var date = new Date(string);
    return date.getMonth() + "/" + date.getDay() + "/" + date.getFullYear();
}

function param(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function updateLoadStatus(status, error){
    if (error){
        $('#intu-menu-error').text(status);
    }
    else {
        $('#intu-menu-error').text('');
        $('#intu-menu-load').text(status + "...");
    }
}

function pullRequest(issueKey){
    if(githubIssues.length > 0){
        for(var p=0; p < githubIssues.length; p++){
            if(githubIssues[p]['title'].indexOf(issueKey) >= 0) {
                return githubIssues[p];
            }
        }
    }
    return null;
}

function shortenName(name){
    var parts = name.split(' ');
    return parts[0] + ' ' + parts[parts.length-1].substring(0,1);
}

function myName(){
//    return 'wbartolome';
    return $('input[title=loggedInUser]').attr('value');
}

function isPlanView(){
    return param('view').indexOf('planning') >= 0;
}

function resetIssueStatus(){
    statusCounts = {New: 0, InProgress: 0, Blocked: 0, Verify: 0, Closed: 0, Deferred: 0};
    statusStoryPoints = {New: 0, InProgress: 0, Blocked: 0, Verify: 0, Closed: 0, Deferred: 0};
}

function resetIssue(elIssue){
    elIssue.attr('lc-sort-order', 0);
    elIssue.css("background-color", "");
    elIssue.css('background-image', 'none');
    elIssue.find('.github-icon, .intu-watchers, .open-icon').remove();
}

// HTML stuffs
function issueLinkJsHtml(issueKey, cssClass){
    var anchor = $('<a />').attr({
        href: "javascript:void(0);",
        target: "_blank",
        class: cssClass + " issueLink"
    });
    return anchor;
}

function issueLinkHtml(issueKey, cssClass){
    var anchor = $('<a />').attr({
        href: "https://jira.intuit.com/browse/" + issueKey,
        target: "_blank",
        class: cssClass
    });
    return anchor;
}

function commentDisplayHtml(comment){
    return comment.body + " (" + comment.author.displayName + " on " + (new Date(comment.updated)).toLocaleString() + ")<br>";
}

function mentionHtml(issueKey, lastComment, summary){
    var name = myName();
    var mentions = $('<p>' + lastComment.body + '</p>').find('a.user-hover');
    for(var iMnt=0; iMnt < mentions.length; iMnt++){
        if(name == $(mentions[iMnt]).attr('rel')){
            $('#intu-mention').append(issueLinkJsHtml(issueKey, 'mention').text(issueKey));
            $('#intu-mention').append(' ' + summary)
            $('#intu-mention').append($(commentDisplayHtml(lastComment)));
            $('#intu-mention').append('<br>');

            var mCount = $('#pluginMentionCount').text();
            if(mCount == '') mCount = '0';
            var nextCount = parseInt(mCount) + 1;
            $('#pluginMentionCount').text(nextCount)
        }
    }
}

// External API Calls
function callJiraForIssues(url){
    console.log('--- callJiraForIssues' + url)
    updateLoadStatus('Calling JIRA API for issues details');
    $.get(url, processIssues, "json")
        .fail(function() {
            updateLoadStatus('Error calling JIRA search api"', true);
        });
}

function getGithubIssues(githubUsername, githubPassword, githubUser, githubRepo) {
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
