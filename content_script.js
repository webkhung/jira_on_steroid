// https://jira.intuit.com/secure/RapidBoard.jspa?rapidView=7690&view=detail&selectedIssue=LCP-480&sprint=12300

var labelTexts = ['FailedQA','InQA','PullRequest','Blocked'];
var labelColors = ['#f3add0','#FFFF99','#77fcfc','#dfb892']; // "#66FFFF"
var labelOrders = [1,2,3,4]; // 3 is reserved for PullRequest
var arrIssues = [];
var pullRequestColor = "#77fcfc";
var pullRequestOrder = 3;

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

window.callGithub = function() {
    var github = new window.Github({
        username: "webkhung",
        password: "",
        auth: "basic"
    });
    var issues = github.getIssues('live-community', 'live_community');
    arrIssues = [];
    issues.list('open', function(err, cb_issues) {
        arrIssues = cb_issues;
    });
}

window.updateJiraBoard = function() {
    var sprintID = getParameterByName('sprint');
    $('.lc-error').remove();
    if (sprintID.length == 0) {
        $('#ghx-board-name').append("<span class='lc-error'>Select a sprint to enable issue highlighting</span>");
    }
    else {
        $.get( "https://jira.intuit.com/rest/api/latest/search?jql=sprint%3D"+sprintID+"&fields=key,labels,summary", function( data ) {
            var arrIssueToSort = [];

            $('.lc-jira-label').remove();

            for(var i=0; i < data.issues.length; i++){
                var elIssue = $("div[data-issue-key='" + data.issues[i].key + "']");
                if (elIssue.length == 0) continue; // in case the card doesn't exist on the UI

                resetIssue(elIssue);

                var labels = data.issues[i].fields.labels;
                var summary = data.issues[i].fields.summary;
                var prInfo = gitPullRequestLabel(summary, elIssue);
                var displayLabel = buildDisplayLabel(labels, prInfo, elIssue, arrIssueToSort);
                addLabelToIssue(displayLabel, elIssue);
            }

            arrIssueToSort.sort(sortByLabelOrder);

            for(var i=0; i < arrIssueToSort.length; i++){
                $(arrIssueToSort[i]).parent().prepend(arrIssueToSort[i]);
            }

        }, "json");
    }
}
window.callGithub();
window.updateJiraBoard();

//setInterval(function(){window.updateJiraBoard()}, 5000);

function sortByLabelOrder(a, b) {
    return a.attr('lc-sort-order') - b.attr('lc-sort-order');
}

function resetIssue(elIssue){
    elIssue.attr('lc-sort-order', 0);
    elIssue.css("background-color", "");
    elIssue.css('background-image', 'none');
}

function buildDisplayLabel(labels, prInfo, elIssue, arrIssueToSort){
    var label = '';

    if (prInfo.length > 0) {
        elIssue.attr('lc-sort-order', pullRequestOrder);
        elIssue.css('background-color', pullRequestColor);
        arrIssueToSort.push($(elIssue));
    }

    for(var j=0; j<labelTexts.length; j++){
        var addToContents = false;

        if(labels.indexOf(labelTexts[j]) > -1) {
            label += (labelTexts[j] + ' ');
            elIssue.css('background-color', labelColors[j]);
            elIssue.attr('lc-sort-order', labelOrders[j]);

            if(!addToContents) {
                arrIssueToSort.push($(elIssue));
                addToContents = true;
            }
        }
    }

    label = label.replace('PullRequest', 'PR');

    if (prInfo.length > 0){
        if (label.indexOf('PR') >= 0){
            return label + ' - ' + prInfo;
        }
        else {
            return 'PR - ' + prInfo;
        }
    }
    else {
        return label;
    }
}

function addLabelToIssue(label, elIssue){
    label = label.trim();
    if (label.length > 0) {
        elIssue.append("<div class='lc-jira-label'>" + label + "</div>");
    }
}

function gitPullRequestLabel(summary, elIssue){
    var pr = pullRequest(summary);
    if (pr == null){
        return "";
    }

    // var psUrl = pr['url'];
    var psDaysOld = Math.round(((new Date) - (new Date(pr['created_at']))) / (1000 * 60 * 60 * 24));
    var psLabel = '';

    if(pr['labels'].length > 0){
        psLabel = pr['labels'][0]['name'];
    }
    var prInfo = psLabel + ' (' + psDaysOld + ' days)';


    if (psDaysOld > 14) {
        var imgURL = chrome.extension.getURL('web.png');
        elIssue.css('background-image', 'url("' + imgURL + '")');
    }

    return prInfo;
}

function pullRequest(summary){
    var str = summary.substring(summary.trim().lastIndexOf(' ') + 1)
    if((str.length == 3 || str.length == 4) && !isNaN(str)) {
        var number = parseInt(str);
        if(arrIssues.length > 0){
            for(var p=0; p < arrIssues.length; p++){
                if(arrIssues[p]['number'] == number) {
                    return arrIssues[p];
                }
            }
        }
    }

    return null;
}


//function gitPullRequestLabel(summary, issue){
//    var prInfo = '';
//    if(arrIssues.length > 0 && summary.lastIndexOf('--') > 0){
//        var pullRequestNum = parseInt(summary.substring(summary.lastIndexOf('--')+2))
//
//        for(var p=0; p < arrIssues.length; p++){
//            if(arrIssues[p]['number'] == pullRequestNum) {
//                var psUrl = arrIssues[p]['url'];
//                var psDaysOld = Math.round(((new Date) - (new Date(arrIssues[p]['created_at']))) / (1000 * 60 * 60 * 24));
//                var psLabel = '';
//                if(arrIssues[p]['labels'].length > 0){
//                    psLabel = arrIssues[p]['labels'][0]['name'];
//                }
//                prInfo = psLabel + ' (' + psDaysOld + ' days)';
//
//
//                if (psDaysOld > 3) {
//                    var imgURL = chrome.extension.getURL('web.png');
//                    issue.css('background-image', 'url("' + imgURL + '")');
//                }
//            }
//        }
//
//        return prInfo;
//    }
//    else {
//        return '';
//    }
//}
