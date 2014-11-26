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
        if (!$('#intu-menu-actions').is(":visible")) {
            $('#intu-menu-load').text(status + "...");
        }
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

function myName(){
    return 'wbartolome';
//    return $('input[title=loggedInUser]').attr('value');
}

// HTML stuffs
function issueLinkJsHtml(issueKey, cssClass){
    var anchor = $('<a />').attr({
        href: "javascript:void(0);",
        onclick: "window.open('https://jira.intuit.com/browse/" + issueKey + "');return false",
        target: "_blank",
        class: cssClass
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

function addOpenIssueLinkTo(elIssue, issueKey){
    if (elIssue.hasClass('ghx-issue-compact')) return
    var img = $('<img />').attr({
        src: chrome.extension.getURL("images/open.png"),
        width:'16',
        height:'15'
    })
    elIssue.find('.ghx-key').append(issueLinkJsHtml(issueKey, 'open-icon').append(img));
}


function addWatchersTo(elIssue, assignee, watchersField, watchersNames){
    var watchers = '';
    if(watchersField) {
        for(var i=0; i < watchersField.length; i++){
            var shortName = shortenName(watchersField[i].displayName); //.name
            if(watchersNames.indexOf(shortName.toLowerCase()) >= 0){
                watchers += (shortName + ", ");
            }
        }
    }

    if(assignee && watchers.indexOf(shortenName(assignee.displayName)) < 0){
        shortName = shortenName(assignee.displayName);
        if(watchersNames.indexOf(shortName.toLowerCase()) >= 0){
            watchers = (shortName + ', ');
        }
    }

    watchers = watchers.substring(0, watchers.length - 2);

    if(watchers.length > 0)
        elIssue.find('.ghx-summary').append("<div class='intu-watchers'>" + watchers + "</div>");
}

function shortenName(name){
    var parts = name.split(' ');
    return parts[0] + ' ' + parts[parts.length-1].substring(0,1);
}

// External API Calls
function callJiraForIssues(url){
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
