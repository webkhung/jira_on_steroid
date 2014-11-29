var githubIssues = [];
var githubUsername, githubPassword, githubUser, githubRepo, watchersNames, hoverDescription, lastComment, relatedCards, fixVersion;
var statusCounts = {New: 0, InProgress: 0, Blocked: 0, Verify: 0, Closed: 0, Deferred: 0};
var statusStoryPoints = {New: 0, InProgress: 0, Blocked: 0, Verify: 0, Closed: 0, Deferred: 0};
var fields = "&fields=key,created,updated,status,summary,description,parent,labels,customfield_11703,customfield_14107,customfield_13624,customfield_11712,priority,subtasks,assignee,issuelinks,fixVersions,comment&maxResults=200";
var planIssueQuery = " and issuetype in standardIssueTypes() and ((sprint is empty and resolutiondate is empty) or sprint in openSprints() or sprint in futureSprints())"
var workIssueQuery = " and (sprint in openSprints())";

if(window.location.href.indexOf('RapidBoard') > 0) {
    chrome.runtime.sendMessage({method: "getLocalStorage", key: "settings"}, function(response) {
        githubUsername = response.githubUsername;
        githubPassword = response.githubPassword;
        githubUser = response.githubUser;
        githubRepo = response.githubRepo;
        watchersNames = response.watchersNames;
        hoverDescription = response.hoverDescription == 'true';
        lastComment = response.lastComment == 'true';
        relatedCards = response.relatedCards == 'true';
        fixVersion = response.fixVersion == 'true';

        setupDocument();
    });

    // go will be an event sent from the document when call window.go()
    document.addEventListener("go", function(data) {
        updateJiraBoard();
    });

    document.addEventListener("loadPlugin", function(data) {
        loadPlugin();
    });
}
else {
    setInterval(function() {
        if (window.location.href.indexOf('https://github.com/live-community/live_community/pull/') == 0){
            changeGithubPage();
        }
    }, 3000);

    changeGithubPage();
}

function setupDocument(){
    // Inject Js to document
    var script = document.createElement('script');
    script.appendChild(document.createTextNode('('+ setupClientLoadPluginEvent +')();'));
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

    // Hide buttons / filters on the board are clicked.
    $('#work-toggle, #plan-toggle').on('click', function(){
        $('#intu-status-issues').html('');
        $('#intu-status').hide();
        $('#intu-menu-load').show();
    });

    $('body').append("<div class='hovercard'></div>");
    $('body').append("<div id='intu-menu'></div>");
}

function loadPlugin(){
    console.log('---loadPlugin');
    if (githubUsername.length > 0 && githubPassword.length > 0 && githubUser.length > 0 && githubRepo.length > 0) {
        getGithubIssues(githubUsername, githubPassword, githubUser, githubRepo);
    }
    updateJiraBoard();
}

function setupClientLoadPluginEvent() {
    // Allow document to call window.go()
    window.go = function() {
        var event = document.createEvent('Event');
        event.initEvent('go');
        document.dispatchEvent(event);
    }

    // Detect Jira message
    GH.Logger.lo = GH.Logger.log;
    GH.Logger.log=function(c,b){
        if (c.indexOf('Finished callbacks for gh.work.pool.rendered') >= 0 || c.indexOf('GH.BacklogView.draw') >= 0){
            var event = document.createEvent('Event');
            event.initEvent('loadPlugin');
            document.dispatchEvent(event);
        }
        GH.Logger.lo(c,b);
    };

    setTimeout(function(){
        $('#ghx-pool').on('click', '.issueLink', function(e){
            var issueKey = $(this).parents('.ghx-issue').data('issue-key');
            window.open('https://jira.intuit.com/browse/' + issueKey);
            e.stopPropagation();
        });
    }, 3000);

    console.yo = console.log;
    console.log = function(str){
        if (str != null && str.indexOf('submit field: compare') >= 0){
            var event = document.createEvent('Event');
            event.initEvent('loadPlugin');
            document.dispatchEvent(event);
        }
        console.yo(str);
    }
}

function changeGithubPage(){
    if($('.js-issue-title').text().indexOf('LCP-') > 0) {
        var issueTitle = $('.js-issue-title').text();
        var issueTitleNoLcp = issueTitle.substring(0, issueTitle.indexOf('LCP-'));
        var lcp = issueTitle.substring(issueTitle.indexOf('LCP-'));
        $('.js-issue-title').text(issueTitleNoLcp);
        $('.js-issue-title').append(issueLinkHtml(lcp, '').text(lcp));
    }
}

function processIssues(data){
    console.log('---processIssues');
    updateLoadStatus('Received ' + data.issues.length + ' issues details');

    $('.ghx-summary').removeAttr('title'); // Dont like their <a> title so remove it.

    data.issues.forEach(function(issue) {
        var elIssue = $("div[data-issue-key='" + issue.key + "'].ghx-issue, div[data-issue-key='" + issue.key + "'].ghx-issue-compact").first();
        if (elIssue.length == 0) return; // in case the card doesn't exist on the UI
        var fields = issue.fields;
        resetIssue(elIssue);
        addHovercardTo(elIssue, fields, issue.key);

        var prLabel = '';
        if (githubIssues.length > 0){
            prLabel = pullRequestLabel(issue.key, elIssue);
            addLabelTo(elIssue, prLabel, 'bottom-right');
        }
        var issueIsPR =  prLabel.length > 0;

        addLabelTo(elIssue, createLabelFrom(fields.labels, issueIsPR, elIssue), 'top-right');
        addAttributesTo(elIssue, fields, issueIsPR);
        addOpenIssueLinkTo(elIssue, issue.key);
        addWatchersTo(elIssue, fields.assignee, fields.customfield_11712, watchersNames);
    });

    setIssueStatus(statusCounts, statusStoryPoints);
}

function updateJiraBoard() {
    console.log('updateJiraBoard');

    addPluginMenu();
    resetIssueStatus();

    var sprintID = param('sprint');
    var rapidViewID = param('rapidView');
    var planView = isPlanView();

    if (sprintID.length == 0 && rapidViewID.length == 0) {
        updateLoadStatus('Not a RapidBoard Url');
    }
    else if (sprintID !== undefined && sprintID != '') {
        callJiraForIssues("https://jira.intuit.com/rest/api/latest/search?jql=sprint%3D" + sprintID + fields);
    }
    else {
        $('#intu-side-menu').toggle(!planView);
        var query = (planView? planIssueQuery : workIssueQuery);
        if(localStorage["jis" + rapidViewID] === undefined){
            $.get("https://jira.intuit.com/rest/greenhopper/1.0/rapidviewconfig/editmodel.json?rapidViewId=" + rapidViewID, function( data ) {
                localStorage["jis" + data.id] = data.filterConfig.id;
                callJiraForIssues("https://jira.intuit.com/rest/api/latest/search?jql=filter=" + data.filterConfig.id + query + fields);
            });
        }
        else {
            callJiraForIssues("https://jira.intuit.com/rest/api/latest/search?jql=filter=" + localStorage["jis" + rapidViewID] + query + fields);
        }
    }
}

function addPluginMenu(){
    $('#intu-menu').html("<span id='intu-menu-load'></span><span id='intu-menu-error'></span>");
    // <a href='javascript:window.go();'>Click me</a>

    if(isPlanView()){
        return;
    }

    $('#intu-side-menu').remove();
    $('body').append("<div id='intu-side-menu'></div>");

    $('#intu-side-menu').append("<a href='javascript:pluginMaxSpace();' title='Maximize Space' class='masterTooltip'><img width=16 height=16 src=" + chrome.extension.getURL('images/max.png') + "></a>");
    $('#intu-side-menu').append("<a href='javascript:pluginCardsWatching(\"" + myName() + "\");' title='Show cards I am watching' class='masterTooltip'><img width=16 height=16 src=" + chrome.extension.getURL('images/watching.png') + "></a>");

    var sorts = {
        label:        { image: "images/label.png", title: "Sort by labels", attr: "_label", order: "desc", valueType: "string" },
        assignee:     { image: "images/assignee.png", title: "Sort by assignees", attr: "_displayName", order: "asc", valueType: "string" }
//        story_points: { image: "images/story_points.png", title: "Sort by story points", attr: "_storyPoint", order: "desc", valueType: "integer" },
    }
    for(var sortKey in sorts) {
        sort = sorts[sortKey];
        var img = $('<img />').attr({ src: chrome.extension.getURL(sort['image']), width:'16', height:'16' })
        var anchor = $('<a />').attr({ title: sort['title'], class: 'sort-icon masterTooltip', href: "javascript:window.sortAllJiraIssues('" + sort['attr'] + "', '" + sort['order'] + "', '" + sort['valueType'] + "')" });
        $('#intu-side-menu').append(anchor.append(img));
    };
    $('#intu-side-menu').append("\
        <a href='javascript:pluginShowUserFilter();' title='User Filters' class='masterTooltip'><img width=16 height=16 src=" + chrome.extension.getURL('images/users.png') + "></a>  \
        <a href='javascript:pluginToggleStatus();' title='Issue Status' class='masterTooltip'><img width=16 height=16 src=" + chrome.extension.getURL('images/status.png') + "></a>  \
        <a href='javascript:pluginHelp();' title='Help' class='masterTooltip'><img width=16 height=16 src=" + chrome.extension.getURL('images/info.png') + "></a>  \
        <a id='pluginMentionCount' href='javascript:pluginMention();' title='You are mentioned' class='masterTooltip'></a>\
        "
    );

    $('#intu-side-menu').append("<div id='intu-mention'></div>")
    $('#intu-side-menu').append("\
        <div id='intu-filter-users' class='intu-container'><strong>Filter By Assignee:</strong> <a href='javascript:pluginClearUserFilter()' style='color:red'>Clear Filter</a> </div> \
        <div id='intu-status'>  \
            <div><strong># of Issues : </strong><span id='intu-status-issues'></span></div>  \
            <div><strong># of Story Pts : </strong><span id='intu-status-points'></span></div>  \
        </div>  \
        <div id='intu-help'>  \
            <strong>For configurable settings, go to Chrome -> Extensions -> Click on <u>Options</u> under this extension\
        </div> \
        "
    );

    $('.masterTooltip').hover(function(){
        var title = $(this).attr('title');
        $(this).data('tipText', title).removeAttr('title');
        $('<p class="tooltip2"></p>').text(title).appendTo('body').fadeIn('fast');
    }, function() {
        $(this).attr('title', $(this).data('tipText'));
        $('.tooltip2').remove();
    }).mousemove(function(e) {
            var mousey = e.pageY - 15; //Get Y coordinates
            $('.tooltip2').css({ top: mousey })
        });
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

    $('#intu-menu-load').hide();
    $('#intu-status-issues').html(strStatusCounts);
    $('#intu-status-points').html(strStatusStoryPoints);
}

function addAttributesTo(elIssue, fields, issueIsPR){
    var storyPoint = 0;
    if (fields.customfield_11703) storyPoint = fields.customfield_11703;

    var displayName = '';
    if (fields.assignee) displayName = fields.assignee.displayName;

    var priority = 5;
    if (fields.priority) fields.priority.id;

    var label = "";
    if (issueIsPR) label = "Pull Request";

    labels = fields.labels.sort();
    if (labels.length > 0){
        for(var j=0; j<labels.length; j++){
            if(labels[j].indexOf('_') == 0){
                label += labels[j].substring(1).toLowerCase();
            }
        }
    }

    var watchers = '';
    if(fields.assignee) watchers = fields.assignee.name + ',';
    if(fields.customfield_11712) {
        for(var i=0; i < fields.customfield_11712.length; i++){
            var watcherName = fields.customfield_11712[i].name;
            var watcherDisplayName = fields.customfield_11712[i].displayName;
            watchers += (watcherName + ",");
        }
    }

    elIssue.attr('_displayName', displayName);
    elIssue.attr('_storyPoint', storyPoint);
    elIssue.attr('_priority', priority);
    elIssue.attr('_label', label);
    elIssue.attr('_watchers', watchers);

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

function createLabelFrom(labels, issueIsPR, elIssue){
    var displayLabel = '';
    labels = labels.sort();

    for(var j=0; j<labels.length; j++){
        if(labels[j].indexOf('_') == 0){
            label = labels[j].substring(1);
            displayLabel += (label + ' ');
        }
    }

    if (displayLabel.length > 0) {
        elIssue.css('background-color', 'rgba('+ hexToRgb(stringToColour(displayLabel)) + ',0.2)');
    }

    if(issueIsPR){
        if (displayLabel.length == 0){
            elIssue.css('background-color', '#C9FEFE');
        }
        displayLabel += 'Pull Request';
    }

    return displayLabel;
}

function addLabelTo(elIssue, label, position){
    label = label.trim();
    if (label.length > 0) {
        if (position == 'bottom-left')
            cssClass = 'intu-label-bottom-left';
        else if (position == 'bottom-top-left')
            cssClass = 'intu-label-bottom-top-left';
        else if (position == 'bottom-right')
            cssClass = 'intu-label-bottom-right';
        else if (position == 'top-left')
            cssClass = 'intu-label-top-left';
        else
            cssClass = "intu-label-top-right";
        elIssue.append("<div class='intu-label " + cssClass + "'>" + label + "</div>");
    }
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
        elIssue.find('.ghx-summary').append("<span class='intu-watchers'>" + watchers + "</span>");
}

function pullRequestLabel(issueKey, elIssue){
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

    if (psDaysOld > 10) {
        var imgURL = chrome.extension.getURL('images/web.png');
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

function addHovercardTo(elIssue, fields, issueKey){
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
                else if(issuelink.inwardIssue && issuelink.inwardIssue.fields.status.name != 'Closed') { // means this issue is blocked by this key
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

    // Comment & Mentioning
    var commentHtml = "";
    if(fields.comment && fields.comment.comments.length > 0) {
        var lastComment = fields.comment.comments[fields.comment.comments.length-1];
        commentHtml += commentDisplayHtml(lastComment);
        if(!isPlanView()) {
            mentionHtml(issueKey, lastComment, fields.summary);
        }
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

    // Acceptance Criteria
    if (fields.customfield_13624 && fields.customfield_13624.length > 0) {
        var accpCount = $('<p>' + fields.customfield_13624 + '</p>').find('li').length;
        if(accpCount == 0) accpCount = 1;
        addLabelTo(elIssue, 'AC ' + accpCount, 'bottom-top-left');
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
            "<h3 style='float:left;padding-top:0px;'>Status</h3>" +
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

            $(this).find('.open-icon').show();

            e.stopPropagation();
        },
        function(){
            $(this).find('.open-icon').hide();
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
