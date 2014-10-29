var githubIssues = [];
var githubUsername, githubPassword, githubUser, githubRepo, hoverDescription, lastComment, relatedCards, fixVersion;
var statusCounts = {New: 0, InProgress: 0, Blocked: 0, Verify: 0, Closed: 0, Deferred: 0};
var statusStoryPoints = {New: 0, InProgress: 0, Blocked: 0, Verify: 0, Closed: 0, Deferred: 0};

//alert(window.location.href);
if(window.location.href.indexOf('RapidBoard') > 0) {
    chrome.runtime.sendMessage({method: "getLocalStorage", key: "settings"}, function(response) {
        githubUsername = response.githubUsername;
        githubPassword = response.githubPassword;
        githubUser = response.githubUser;
        githubRepo = response.githubRepo;
        hoverDescription = response.hoverDescription == 'true';
        lastComment = response.lastComment == 'true';
        relatedCards = response.relatedCards == 'true';
        fixVersion = response.fixVersion == 'true';

        setupDocument();
    });

    // hello will be an event sent from the document when call window.go()
    document.addEventListener("hello", function(data) {
        alert('cs');
        updateJiraBoard(); // chrome.runtime.sendMessage("test"); What does this do?
    });

    document.addEventListener("loadPlugin", function(data) {
        loadPlugin();
    });
}
else {
    setInterval(function() {
        if (window.location.href.indexOf('https://github.com/live-community/live_community/pull/') == 0){
            console.log('modify');
            changeGithubPage();
        }
    }, 3000);

    changeGithubPage();
}

function changeGithubPage(){
    if($('.js-issue-title').text().indexOf('LCP-') > 0) {
        var issueTitle = $('.js-issue-title').text();
        var issueTitleNoLcp = issueTitle.substring(0, issueTitle.indexOf('LCP-'));
        var lcp = issueTitle.substring(issueTitle.indexOf('LCP-'));
        $('.js-issue-title').text(issueTitleNoLcp);
        var jiraLink = $('<a />').attr({
            href: "https://jira.intuit.com/browse/" + lcp,
            target: '_blank'
        }).text(lcp);;
        $('.js-issue-title').append(jiraLink);
    }
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

function getJiraIssues(sprintID){
    updateLoadStatus('Calling JIRA API for issues details');

    $.get("https://jira.intuit.com/rest/api/latest/search?jql=sprint%3D"+sprintID+"&fields=" +
        "key,created,updated,status,summary,description,parent,labels,customfield_11703,customfield_14107,priority,subtasks,assignee,issuelinks,fixVersions,comment&maxResults=200", function( data ) {

        updateLoadStatus('Received ' + data.issues.length + ' issues details');

        $('.custom-sort').remove();
        $('.ghx-summary').removeAttr('title'); // Dont like their <a> title so remove it.

        data.issues.forEach(function(issue) {
            var elIssue = $("div[data-issue-key='" + issue.key + "'].ghx-issue, div[data-issue-key='" + issue.key + "'].ghx-issue-compact").first();
            if (elIssue.length == 0) return; // in case the card doesn't exist on the UI
            var fields = issue.fields;

            resetIssue(elIssue);
            addHovercardTo(elIssue, fields);

            var prLabel = '';
            if (githubIssues.length > 0){
                prLabel = pullRequestLabel(issue.key, elIssue);
                addLabelTo(elIssue, prLabel, 'bottom-right');
            }

            addLabelTo(elIssue, issueLabel(fields.labels, prLabel, elIssue), 'top-right');
            setIssueAttributesTo(elIssue, fields, prLabel);
        });

        setIssueStatus(statusCounts, statusStoryPoints);
        addSortToColumnHeader();
    }, "json")
    .fail(function() {
        updateLoadStatus('Error calling JIRA search api"', true);
    });

}

function updateJiraBoard() {
    console.log('updateJiraBoard');
    resetIssueStatus();

    var sprintID = getParameterByName('sprint');
    var rapidViewID = getParameterByName('rapidView');

    if (sprintID.length == 0 && rapidViewID.length == 0) {
        updateLoadStatus('Not a RapidBoard Url');
    }
    else {
        if (sprintID.length > 0) {
            getJiraIssues(sprintID);
        }
        else {
            updateLoadStatus('Not active sprint.  Calling JIRA API for the first sprint');

            $.get("https://jira.intuit.com/rest/greenhopper/1.0/xboard/work/allData/?rapidViewId=" + rapidViewID, function( data ) {
                if (data.sprintsData.sprints.length > 3){
                    updateLoadStatus('Too many sprints.  Please select a sprint first.', true);
                }
                else {
                    for(var i=0; i < data.sprintsData.sprints.length; i++){
                        var sprint = data.sprintsData.sprints[i];
                        updateLoadStatus("Get issues in sprint " + sprint.name);
                        getJiraIssues(sprint.id);
                    }
                }
            })
            .fail(function() {
                updateLoadStatus('Error calling JIRA greenhopper Api', true);
            });
        }
    }
}

function loadPlugin(){
    console.log('loadPlugin');
    if (githubUsername.length > 0 && githubPassword.length > 0 && githubUser.length > 0 && githubRepo.length > 0) {
        getGithubIssues(githubUsername, githubPassword, githubUser, githubRepo);
    }

    addPluginMenu();

    updateJiraBoard();
}

function addPluginMenu(){
    $('#intu-menu').html(
        "<span id='intu-menu-container'>  \
        <span id='intu-menu-load'></span>  \
        <span id='intu-menu-error'></span>  \
        <span id='intu-menu-actions' style='display:none'>  \
            <a href='javascript:pluginToggleStatus();'>Issue Status</a>  \
            <a href='javascript:pluginMaxSpace();'>Maximize Space</a>  \
            <a href='javascript:pluginHelp();'>Tips</a>  \
        </span>  \
        </span>  \
        <a id='intu-menu-toggle' style='text-decoration: none !important' href='javascript:pluginClose();'>></a>  \
        <div id='intu-filter-users' class='intu-container'><strong>Filter By User:</strong> <a href='javascript:pluginClearUserFilter()'>All</a> </div> \
        <div id='intu-status'>  \
            <div><strong>Number of Issues : </strong><span id='intu-status-issues'></span></div>  \
            <div><strong>Number of Story Points : </strong><span id='intu-status-points'></span></div>  \
            <div>(The above numbers are from 1 active sprint or the first 3 sprints if no active sprints.)</div> \
        </div>  \
        <div id='intu-help'>  \
            <div class='intu-container'> \
                <strong>Pick what fields to show on hover</strong><br> \
                Select what fields to show: Chrome -> Extensions -> Click on <u>Options</u> under this externsion<br> \
                <strong>Labeling</strong><br> \
                JIRA labels started with underscore \"_\" are displayed on the top right corner of the card. e.g. \"_InQA\", \"_FailedQA\"<br>  \
                <strong>Sub tasks, blocking / blocked tasks</strong><br>  \
                Any sub tasks and blocking/blocked by tasks are displayed on the top left corner of the card.<br>  \
                <strong>Hygiene</strong><br>  \
                If the hygiene checkbox is checked, a “Hygiene” label is displayed on the bottom left corner of the card.<br>  \
                <strong>Sorting</strong><br>  \
                This plugin supports sorted by users, story points, and labels.<br>  \
                <strong>Keyboard Shortcut</strong><br>  \
                Click on a JIRA card and press \"E\" to bring up the edit dialog.<br>  \
                <strong>Github pull request</strong><br>  \
                If you use Github to track pull requests, enter the Github info on the option page, and put the JIRA issue number to the pull request title.<br>The plugin would display the pull request label on the bottom right corner of the card.<br>  \
                <br><div class='intu-container'>Please submit bugs, feature requests, feedback to <u>kelvin_hung@intuit.com</u>.<br>This is a private Chrome plugin, you can find the plugin <a href='https://chrome.google.com/webstore/detail/jira-on-steroid/allgccigpmbiidjamamjhhcpbclmdgln' target='_blank'>here</a></div>  \
            </div>\
        </div>"
    );
    // <a href='javascript:window.go();'>Click me</a>
}

function setIssueStatus(statusCounts, statusStoryPoints) {
    var strStatusCounts = '';
    Object.keys(statusCounts).forEach(function (key) {
        var value = statusCounts[key];
        strStatusCounts += key + ": <strong>" + value + "</strong>&nbsp;&nbsp;&nbsp;";
    });

    var strStatusStoryPoints = '';
    Object.keys(statusStoryPoints).forEach(function (key) {
        var value = statusStoryPoints[key];
        strStatusStoryPoints += key + ": <strong>" + value + "</strong>&nbsp;&nbsp;&nbsp;";
    });

//    if($('#intu-status-issues').is(':empty')){
//        $('#intu-menu-actions').show();
//    }

    $('#intu-menu-load').hide();
    $('#intu-status-issues').html(strStatusCounts);
    $('#intu-status-points').html(strStatusStoryPoints);
}

function resetIssueStatus(){
    statusCounts = {New: 0, InProgress: 0, Blocked: 0, Verify: 0, Closed: 0, Deferred: 0};
    statusStoryPoints = {New: 0, InProgress: 0, Blocked: 0, Verify: 0, Closed: 0, Deferred: 0};
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

    if(fields.issuelinks) {
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
    }

    if (blocking.length > 0) blocking = "Blocking " + blocking;
    if (blockedBy.length > 0) blockedBy = "Blocked By " + blockedBy;
    if(blockHtml.length > 0) blockHtml = '<h3>Block</h3>' + blockHtml;

    // Comment
    var commentHtml = "";
    if(fields.comment && fields.comment.comments.length > 0) {
        comment = fields.comment.comments[fields.comment.comments.length-1];
        commentHtml += comment.body + " (" + comment.author.displayName + " on " + (new Date(comment.updated)).toLocaleString() + ")<br>";
    }
    if(commentHtml.length > 0){
        commentHtml = "<h3>Last Comment</h3><div class='hovercard-comment'>" + commentHtml + "</div>";
    }

    // fixVersion
    var fixVersionHtml = "";
    if(fields.fixVersions && fields.fixVersions.length > 0){
        fixVersions = fields.fixVersions[0];
        fixVersionHtml = "<h3>Fix Version</h3>" + fixVersions.name + " - " + fixVersions.description;
    }


    addLabelTo(elIssue, blocking + blockedBy, 'top-left');

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

    // This is on Plan view. Add summary
    var summaryHtml = '';
    if (elIssue.hasClass('ghx-issue-compact')){
        summaryHtml = "<h3>Summary</h3>" + fields.summary;
    }

    // Attach hovercard event to each jira issue element
    elIssue.find('.ghx-issue-fields:first, .ghx-key').first().hovercard({
        detailsHTML:
            "<h3 style='float:left'>Status</h3>" +
                "<div style='float:right'>Created: " + (new Date(fields.created)).toLocaleDateString() + " Updated: " + (new Date(fields.updated)).toLocaleDateString() +
                "</div><div style='clear:both'></div>" +
                fields.status.name +
                (fixVersion ? fixVersionHtml : "")+
                summaryHtml +
                (hoverDescription ? "<h3>Description</h3><div class='hovercard-desc'>" + fields.description + "</div>" : "")+
                (lastComment ? parentHtml : "")+
                (lastComment ? subtaskHtml : "")+
                (lastComment ? blockHtml : "")+
                (relatedCards? commentHtml : ""),
        width: 450,
        relatedIssues: subtaskKeys.concat(parentKey),
        blocks: blocks
    });
}

function resetIssue(elIssue){
    elIssue.attr('lc-sort-order', 0);
    elIssue.css("background-color", "");
    elIssue.css('background-image', 'none');
}

function setIssueAttributesTo(elIssue, fields, prLabel){
    var storyPoint = 0;
    if (fields.customfield_11703) storyPoint = fields.customfield_11703;

    var displayName = '';
    if (fields.assignee) displayName = fields.assignee.displayName;

    var priority = 5;
    if (fields.priority) fields.priority.id;

    var label = prLabel;

    labels = fields.labels.sort();
    if (labels.length > 0){
        for(var j=0; j<labels.length; j++){
            if(labels[j].indexOf('_') == 0){
                label += labels[j].substring(1).toLowerCase();
            }
        }
    }

    elIssue.attr('_displayName', displayName);
    elIssue.attr('_storyPoint', storyPoint);
    elIssue.attr('_priority', priority);
    elIssue.attr('_label', label);

    // Add name filter
    if(displayName.length > 0 && $(".intu-filter-user[_displayName='" + displayName + "']").length == 0){
        var linkUser = $('<a />').attr({
            class: 'intu-filter-user',
            href: "javascript:pluginFilterUser('" + displayName + "')",
            _displayName: displayName
        }).text(displayName);
        $('#intu-filter-users').append(linkUser);
    }
}

function issueLabel(labels, prLabel, elIssue){
    var displayLabel = '';

    labels = labels.sort();

    for(var j=0; j<labels.length; j++){
        if(labels[j].indexOf('_') == 0){
            label = labels[j].substring(1);
            displayLabel += (label + ' ');
        }
    }

    if (displayLabel.length > 0) {
        var color = stringToColour(displayLabel);
        elIssue.css('background-color', 'rgba('+ hexToRgb(color) + ',0.2)');
    }

    if(prLabel.length > 0){
        if (displayLabel.length == 0){
            elIssue.css('background-color', '#C9FEFE');
        }
        displayLabel += 'Pull Request';
    }

    return displayLabel;
}

function addLabelTo(elIssue, label, position){
//    elIssue.find('div').remove('.intu-label, .intu-label-top-right, .intu-label-bottom-left, .intu-label-bottom-right, .intu-label-top-left');

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

function pullRequestLabel(issueKey, elIssue){
    var pr = pullRequest(issueKey);
    if (pr == null){
        return "";
    }

    // var psUrl = pr['url'];
    var psDaysOld = Math.round(((new Date) - (new Date(pr['created_at']))) / (1000 * 60 * 60 * 24));
    var psLabel = '';

    if(pr['labels'].length > 0){
        psLabel = pr['labels'][0]['name'];
    }

    var prInfo = psLabel + ' (PR: ' + psDaysOld + ' days)';

    if (psDaysOld > 10) {
        var imgURL = chrome.extension.getURL('images/web.png');
        elIssue.css('background-image', 'url("' + imgURL + '")');
    }

    return prInfo;
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

function addSortToColumnHeader(){
    if ($('.ghx-swimlane').length > 1) {
        $('.custom-sort').remove();
        return;
    }

    $('#ghx-column-headers .ghx-column').each(function(){
        var dataId = $(this).attr('data-id');

        var sorts = {
            assignee:       { image: "images/assignee.png", title: "Assignee", attr: "_displayName", order: "asc", valueType: "string" },
            story_points:   { image: "images/story_points.png", title: "Story Points", attr: "_storyPoint", order: "desc", valueType: "integer" },
            label:          { image: "images/label.png", title: "Label", attr: "_label", order: "desc", valueType: "string" }
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

function main() {
    // Allow document to call window.go()
    window.go = function() {
        var event = document.createEvent('Event');
        event.initEvent('hello');
        document.dispatchEvent(event);
    }

    // Detect Jira message
    console.yo = console.log;
    console.log = function(str){
        if (str.indexOf('Finished callbacks for gh.work.pool.rendered') > 0 || str.indexOf('issueUpdated') > 0 || str.indexOf(': GH.BacklogView.draw') > 0){
            console.yo('Load Plugin');
            var event = document.createEvent('Event');
            event.initEvent('loadPlugin');
            document.dispatchEvent(event);
        }
        console.yo(str);
    }
}

function setupDocument(){
    // Inject Js to document
    var script = document.createElement('script');
    script.appendChild(document.createTextNode('('+ main +')();'));
    (document.body || document.head || document.documentElement).appendChild(script);

    // Inject Css to document
    var css = '.ghx-issue .ghx-end { box-shadow: none !important; background: transparent !important; bottom: 12px !important;}',
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

    // Trigger updateJireBoard when the buttons / filters on the board are clicked.
    $('#work-toggle, #plan-toggle').on('click', function(){
        $('#intu-status-issues').html('');
        $('#intu-menu-load').show();
        $('#intu-menu-actions, #intu-status').hide();

        updateLoadStatus('Updating Board');
        loadPlugin();
    });


    $('body').append("<div class='hovercard'></div>");
    $('body').append("<div id='intu-menu'></div>");
}

$.fn.hovercard = function(options) {
    $(this).unbind('mouseenter mouseleave');
    $(this).hover(
        function(e){
            var offset = $(this).offset();
            $('.hovercard').html(options.detailsHTML);

            var width = $('.hovercard').width();
            var height = $('.hovercard').height();
            var top = 0, left = 0;

            // Top
            if (($(this).offset().top + height/2) >  window.innerHeight){
                top = window.innerHeight - height - 20;
            }
            else {
                top = $(this).offset().top - height/2;
            }

            // Left - different cases for plan view and work view
            if ($(this).hasClass('ghx-key')){
                left = offset.left + $(this).width() + 10;
            }
            else {
                if( (offset.left + $(this).width() + 45 + width) > window.innerWidth){
                    left = offset.left - width - 20;
                    if (left < 0) left = offset.left + $(this).width() + 45; // ugly.... fix late.
                }
                else {
                    left = offset.left + $(this).width() + 45;
                }
            }

            $('.hovercard').show().offset({'top': top, 'left': left});

            for(var i=0; i < options.relatedIssues.length; i++){
                var elIssue = $("div[data-issue-key='" + options.relatedIssues[i] + "'].ghx-issue");
                elIssue.find('.ghx-issue-fields:first').css('border','dotted 2px red');
            }

            for(var i=0; i < options.blocks.length; i++){
                var elIssue = $("div[data-issue-key='" + options.blocks[i] + "'].ghx-issue");
                elIssue.find('.ghx-issue-fields:first').css('border','dotted 2px red');
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
