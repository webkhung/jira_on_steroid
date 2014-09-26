// https://jira.intuit.com/secure/RapidBoard.jspa?rapidView=7690&view=detail&selectedIssue=LCP-480&sprint=12300


document.addEventListener("hello", function(data) {
    alert('cs');
    window.updateJiraBoard();
//    chrome.runtime.sendMessage("test");
});


injectJsCssToDocument();



// Just to test calling method in here.
$('#work-toggle').on('click', function(){
    alert('2222');
    window.updateJiraBoard();
});


// Put hovercard to the document
$('body').append("<div class='hovercard'></div>");

$('body').append("<div class='intu-jira-status'></div>");

var labelTexts = ['FailedQA','InQA','PullRequest','Blocked'];
var labelColors = ['#f3add0','#FFFF99','#77fcfc','#dfb892']; // "#66FFFF"
var labelOrders = [1,2,3,4]; // 3 is reserved for PullRequest
var pullRequestColor = "#77fcfc";
var pullRequestOrder = 3;
var githubIssues = [];
var githubUserName = ''
var githubPassword = ''

var statusCounts = {New: 0, InProgress: 0, Blocked: 0, Verify: 0, Closed: 0, Deferred: 0};
var statusStoryPoints = {New: 0, InProgress: 0, Blocked: 0, Verify: 0, Closed: 0, Deferred: 0};

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

window.callGithub = function() {
    var github = new window.Github({
        username: githubUserName,
        password: githubPassword,
        auth: "basic"
    });
    var issues = github.getIssues('live-community', 'live_community');
    githubIssues = [];
    issues.list('open', function(err, cb_issues) {
        githubIssues = cb_issues;
    });
}

window.updateJiraBoard = function() {
    var sprintID = getParameterByName('sprint');
    var rapidViewID = getParameterByName('rapidView');

    $('.intu-error').remove();

    if (sprintID.length == 0 && rapidViewID.length == 0) {
        updateLoadStatus('Not a RapidBoard Url');
    }
    else {
        var apiURL = '';
        if (sprintID.length > 0) {
            getJiraIssues(sprintID);
        }
        else {
            updateLoadStatus('Not active sprint.  Calling JIRA API for the first sprint');

            $.get("https://jira.intuit.com/rest/greenhopper/1.0/xboard/work/allData/?rapidViewId=" + rapidViewID, function( data ) {

                updateLoadStatus("Received sprint " + data.sprintsData.sprints[0].name);

                var sprintID = data.sprintsData.sprints[0].id;
                getJiraIssues(sprintID);
            });
        }
    }
}

function getJiraIssues(sprintID){
    updateLoadStatus('Calling JIRA API for issues details');

    $.get( "https://jira.intuit.com/rest/api/latest/search?jql=sprint%3D"+sprintID+"&fields=" +
        "key,created,updated,status,summary,description,parent,labels,customfield_11703,customfield_14107,priority,subtasks,assignee,issuelinks&maxResults=200", function( data ) {
        var arrIssueToSort = [];

        updateLoadStatus('Received ' + data.issues.length + ' issues details');

        $('.intu-jira-label .intu-jira-label-left').remove();
        $('.ghx-summary').removeAttr('title');

        data.issues.forEach(function(issue) {
            var elIssue = $("div[data-issue-key='" + issue.key + "'].ghx-issue");
            if (elIssue.length == 0) return; // in case the card doesn't exist on the UI

            resetIssue(elIssue);

            var fields = issue.fields;

            setIssueAttributesTo(elIssue, fields);

            addHovercardTo(elIssue, fields);

            var prInfo = '';
            if (githubIssues.length > 0){
                prInfo = gitPullRequestLabel(fields.summary, elIssue);
            }

            var displayLabel = buildDisplayLabel2(fields.labels, prInfo, elIssue, arrIssueToSort);
            addLabelTo(elIssue, displayLabel, 'top-right');
        });

        addStats(statusCounts, statusStoryPoints);
        addSortToColumnHeader();

//            arrIssueToSort.sort(sortByLabelOrder);
//
//            for(var i=0; i < arrIssueToSort.length; i++){
//                $(arrIssueToSort[i]).parent().prepend(arrIssueToSort[i]);
//            }

    }, "json");

}

if (githubUserName.length > 0 && githubPassword.length > 0) {
    window.callGithub();
}

window.updateJiraBoard();

//setInterval(function(){window.updateJiraBoard()}, 5000);

function addStats(statusCounts, statusStoryPoints){
    var strStatusCounts = '';
    Object.keys(statusCounts).forEach(function (key) {
        var value = statusCounts[key];
        strStatusCounts += key + " : <strong>" + value + "</strong> ";
    });

    var strStatusStoryPoints = '';
    Object.keys(statusStoryPoints).forEach(function (key) {
        var value = statusStoryPoints[key];
        strStatusStoryPoints += key + " : <strong>" + value + "</strong> ";
    });

    $('.intu-jira-status').html(
        "<a href='javascript:toggleStatus();'>Show Issue Status</a>" +
            "<a href='javascript:window.maxSpace();'>Maximize Space</a>" +
        "<a href='javascript:window.go();'>Click me</a>" +
        "<div id='intu-status-container'>" +
            "<div><strong>Number of Issues : </strong>" + strStatusCounts + "</div>" +
            "<div><strong>Number of Story Points : </strong>" + strStatusStoryPoints + "</div>" +
        "</div>"
    );

//    $('#content').append(
//        "<div class='intu-jira-load-status'>aaaa</div>"
//
//    );
}

function addHovercardTo(elIssue, fields){
    // Subtasks
    var subtaskHtml = '';
    var subtaskKeys = [];

    fields.subtasks.forEach(function(subtask) {
        subtaskKeys.push(subtask.key);
        subtaskHtml += "<p>" + subtask.key + ' ' + subtask.fields.summary + " (" + subtask.fields.status.name + ")</p>";
    });
    if(subtaskHtml.length > 0) subtaskHtml = '<h3>Sub tasks</h3>' + subtaskHtml;

    // Parent
    var parentHtml = '';
    var parentKey = [];
    if (fields.parent) {
        parentKey.push(fields.parent.key);
        parentHtml += "<p>" + fields.parent.key + ' ' + fields.parent.fields.summary + " (" + fields.parent.fields.status.name + ")</p>";
    }
    if(parentHtml.length > 0) parentHtml = '<h3>Parent</h3>' + parentHtml;

    // Blocking and Blocked By
    var blocking = "";
    var blockedBy = "";
    var blockHtml = "";
    var blocks = [];

    fields.issuelinks.forEach(function(issuelink) {
        if(issuelink.type.name == 'Blocks'){
            if(issuelink.outwardIssue) { // means blocking this key
                blocking += (issuelink.outwardIssue.key + ' ');
                blocks.push(issuelink.outwardIssue.key);
                blockHtml += "<p>Blocking: " + issuelink.outwardIssue.key + ' ' + issuelink.outwardIssue.fields.summary + " (" + issuelink.outwardIssue.fields.status.name + ")</p>";
            }
            else if(issuelink.inwardIssue) { // means this issue is blocked by this key
                blockedBy += (issuelink.inwardIssue.key) + ' ';
                blocks.push(issuelink.inwardIssue.key);
                blockHtml += "<p>Blocked By: " + issuelink.inwardIssue.key + ' ' + issuelink.inwardIssue.fields.summary + " (" + issuelink.inwardIssue.fields.status.name + ")</p>";
            }
        }
    });

    if (blocking.length > 0) blocking = "Blocking " + blocking;
    if (blockedBy.length > 0) blockedBy = "Blocked By " + blockedBy;
    if(blockHtml.length > 0) blockHtml = '<h3>Block</h3>' + blockHtml;


    addLabelTo(elIssue, blocking + blockedBy, 'bottom-right');

    // Hygenie
    if (fields.customfield_14107 && fields.customfield_14107[0].value == 'Yes') {
        addLabelTo(elIssue, 'Hygiene', 'bottom-left');
    }

    // Status count
    statusCounts[fields.status.name.replace(' ', '')] = statusCounts[fields.status.name.replace(' ', '')] + 1;

    var storyPoint = 0;
    if (fields.customfield_11703) {
        statusStoryPoints[fields.status.name.replace(' ', '')] = statusStoryPoints[fields.status.name.replace(' ', '')] + fields.customfield_11703;
    }

    // Attach hovercard event to each jira issue element
    elIssue.find('.ghx-issue-fields:first').hovercard({
        detailsHTML:
            "<h3 style='float:left'>Status</h3>" +
                "<div style='float:right'>Crt: " + toDate(fields.created) + " Upd: " + toDate(fields.updated) +
                "</div><div style='clear:both'></div>" +
                fields.status.name +
                "<h3>Description</h3>" + $(fields.description).text().substring(0, 400) +
                parentHtml +
                subtaskHtml +
                blockHtml,
        width: 400,
        relatedIssues: subtaskKeys.concat(parentKey),
        blocks: blocks
    });
}

function toDate(string){
    var date = new Date(string);
    return date.getMonth() + "/" + date.getDay() + "/" + date.getFullYear();
}

function sortByLabelOrder(a, b) {
    return a.attr('lc-sort-order') - b.attr('lc-sort-order');
}

function resetIssue(elIssue){
    elIssue.attr('lc-sort-order', 0);
    elIssue.css("background-color", "");
    elIssue.css('background-image', 'none');
}

function setIssueAttributesTo(elIssue, fields){
    // Label
//    var label = '';
//    for(var j=0; j<labelTexts.length; j++){
//        if(fields.labels.indexOf(labelTexts[j]) > -1) {
//            label += (labelTexts[j] + ' ');
//            elIssue.css('background-color', labelColors[j]);
//            elIssue.attr('_labelOrder', labelOrders[j]);
//        }
//    }

    var storyPoint = 0;
    if (fields.customfield_11703) storyPoint = fields.customfield_11703;

    var displayName = '';
    if (fields.assignee) displayName = fields.assignee.displayName;

    var priority = 5;
    if (fields.priority) fields.priority.id;

    var label = '';
    labels = fields.labels.sort();
    for(var j=0; j<labels.length && labels[j].indexOf('_') == 0; j++){
        label = labels[j].substring(1).toLowerCase();
        break;
    }


    elIssue.attr('_displayName', displayName);
    elIssue.attr('_storyPoint', storyPoint);
    elIssue.attr('_priority', priority);
    elIssue.attr('_label', label);
}


function buildDisplayLabel2(labels, prInfo, elIssue, arrIssueToSort){
    var displayLabel = '';

//    if (prInfo.length > 0) {
//        elIssue.attr('lc-sort-order', pullRequestOrder);
//        elIssue.css('background-color', pullRequestColor);
//        arrIssueToSort.push($(elIssue));
//    }

    labels = labels.sort();
    var first = true;

    for(var j=0; j<labels.length && labels[j].indexOf('_') == 0 && first; j++){
        first = false;
        label = labels[j].substring(1).toLowerCase();
        displayLabel += (label + ' ');

        var color = stringToColour(label);
        elIssue.css('background-color', 'rgba('+ hexToRgb(color) + ',0.4)');
//      elIssue.attr('lc-sort-order', labelOrders[j]);
    }

    return displayLabel;

//    for(var j=0; j<labelTexts.length; j++){
//        var addToContents = false;
//
//        if(labels.indexOf(labelTexts[j]) > -1) {
//            label += (labelTexts[j] + ' ');
//            elIssue.css('background-color', labelColors[j]);
//            elIssue.attr('lc-sort-order', labelOrders[j]);
//
//            if(!addToContents) {
//                arrIssueToSort.push($(elIssue));
//                addToContents = true;
//            }
//        }
//    }
//
//    label = label.replace('PullRequest', 'PR');
//
//    if (prInfo.length > 0){
//        if (label.indexOf('PR') >= 0){
//            return label + ' - ' + prInfo;
//        }
//        else {
//            return 'PR - ' + prInfo;
//        }
//    }
//    else {
//        return label;
//    }
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

$.fn.hovercard = function(options) {
    $(this).hover(
        function(e){
            var offset = $(this).offset();
            $('.hovercard').show().offset({'top': offset.top + 70, 'left' : offset.left});
            $('.hovercard').html(options.detailsHTML);

            for(var i=0; i < options.relatedIssues.length; i++){
                var elIssue = $("div[data-issue-key='" + options.relatedIssues[i] + "'].ghx-issue");
                elIssue.find('.ghx-issue-fields:first').css('border','solid 3px red');
            }

            for(var i=0; i < options.blocks.length; i++){
                var elIssue = $("div[data-issue-key='" + options.blocks[i] + "'].ghx-issue");
                elIssue.find('.ghx-issue-fields:first').css('border','solid 3px red');
            }

            e.stopPropagation();
        },
        function(){
            $('.hovercard').hide();
            $('.hovercard').html('');

            for(var i=0; i < options.relatedIssues.length; i++){
                var elIssue = $("div[data-issue-key='" + options.relatedIssues[i] + "'].ghx-issue");
                elIssue.find('.ghx-issue-fields:first').css('border','none');
            }

            for(var i=0; i < options.blocks.length; i++){
                var elIssue = $("div[data-issue-key='" + options.blocks[i] + "'].ghx-issue");
                elIssue.find('.ghx-issue-fields:first').css('border','none');
            }
        }
    );
}

//function addLabelToIssueLeft(label, elIssue){
//    label = label.trim();
//    if (label.length > 0) {
//        elIssue.append("<div class='intu-jira-label-left'>" + label + "</div>");
//    }
//}

function addLabelTo(elIssue, label, position){
    label = label.trim();
    if (label.length > 0) {
        if (position == 'bottom-left')
            cssClass = 'intu-label-bottom-left';
        else if (position == 'bottom-right')
            cssClass = 'intu-label-bottom-right';
        else if (position == 'top-left')
            cssClass = 'intu-label-top-left';
        else
            cssClass = "intu-label-top-right";
        elIssue.append("<div class='intu-label " + cssClass + "'>" + label + "</div>");
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
        var imgURL = chrome.extension.getURL('images/web.png');
        elIssue.css('background-image', 'url("' + imgURL + '")');
    }

    return prInfo;
}

function pullRequest(summary){
    var str = summary.substring(summary.trim().lastIndexOf(' ') + 1)
    if((str.length == 3 || str.length == 4) && !isNaN(str)) {
        var number = parseInt(str);
        if(githubIssues.length > 0){
            for(var p=0; p < githubIssues.length; p++){
                if(githubIssues[p]['number'] == number) {
                    return githubIssues[p];
                }
            }
        }
    }

    return null;
}

function addSortToColumnHeader(){
    $('#ghx-column-headers .ghx-column').each(function(){
        var dataId = $(this).attr('data-id');

        var sorts = {
            assignee: {
                image: "images/assignee.png", title: "Assignee", attr: "_displayName", order: "asc", valueType: "string"
            },
            story_points: {
                image: "images/story_points.png", title: "Story Points", attr: "_storyPoint", order: "desc", valueType: "integer"
            },
            label: {
                image: "images/priority.png", title: "Label", attr: "_label", order: "desc", valueType: "string"
            }
        }

        for(var sortKey in sorts) {
            sort = sorts[sortKey];

            var img = $('<img />').attr({
                src: chrome.extension.getURL(sort['image']),
                width:'16',
                height:'16'
            })
            var anchor = $('<a />').attr({
                title: sort['titles'],
                class: 'custom-sort',
                href: "javascript:window.sortJiraIssues('" + dataId + "', '" + sort['attr'] + "', '" + sort['order'] + "', '" + sort['valueType'] + "')"
            });

            $(this).append(anchor.append(img));
        };
    });
}

function updateLoadStatus(status){
    $('.intu-jira-status').text(status + "...");
}
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

function main() {
    // Allow document to call window.go()
    window.go = function() {
        var event = document.createEvent('Event');
        event.initEvent('hello');
        document.dispatchEvent(event);
    }
}

function injectJsCssToDocument(){
    // Inject Js to document
    var script = document.createElement('script');
    script.appendChild(document.createTextNode('('+ main +')();'));
    (document.body || document.head || document.documentElement).appendChild(script);

    // Inject Css to document
    var css = '.ghx-issue .ghx-end { box-shadow: none; background: transparent; bottom: 12px !important;}',
        head = document.head || document.getElementsByTagName('head')[0],
        style = document.createElement('style');

    style.type = 'text/css';
    if (style.styleSheet){
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }
    head.appendChild(style);


    // Inject script.js to the document
    var s = document.createElement('script');
    s.src = chrome.extension.getURL('script.js');
    (document.head||document.documentElement).appendChild(s);
    s.onload = function() {
        s.parentNode.removeChild(s);
    };
}
