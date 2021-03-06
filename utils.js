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

function shadeColor(color, percent) {
    var B, BB, G, GG, R, RR;
    if (color.substring(0, 1) !== '#') {
        color = rbgToHex(color);
    }
    R = parseInt(color.substring(1, 3), 16);
    G = parseInt(color.substring(3, 5), 16);
    B = parseInt(color.substring(5, 7), 16);
    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);
    R = (R < 255 ? R : 255);
    G = (G < 255 ? G : 255);
    B = (B < 255 ? B : 255);
    RR = (R.toString(16).length === 1 ? "0" + (R.toString(16)) : R.toString(16));
    GG = (G.toString(16).length === 1 ? "0" + (G.toString(16)) : G.toString(16));
    BB = (B.toString(16).length === 1 ? "0" + (B.toString(16)) : B.toString(16));
    return "#" + RR + GG + BB;
};

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
    return $('input[title=loggedInUser]').attr('value');
}

function isPlanView(){
    return param('view').indexOf('planning') >= 0;
}

function resetIssueStatus(){
    statusCounts = {};
    statusStoryPoints = {};
}

function resetIssue(elIssue){
    elIssue.attr('lc-sort-order', 0);
    elIssue.css("background-color", "");
    elIssue.css('background-image', 'none');
    elIssue.find('.github-icon, .intu-watchers, .open-icon, .speed_data').remove();
}

function incrementCount(element){
    var str = element.text();
    var rest = str.substring(0, str.lastIndexOf("(") + 1);
    var last = str.substring(str.lastIndexOf("(") + 1, str.length);
    var count = parseInt(last.substring(0, last.lastIndexOf(")")));
    count++;
    element.text(rest + count + ')');
}

// HTML stuffs
function addUserFilter(displayName){
    var elements = $(".intu-filter-user[_displayName='" + displayName.replace(/'/g, "\\'") + "']");
    if(elements.length == 0){
        var linkUser = $('<a />').attr({
            class: (displayName == 'Unassigned'? 'intu-filter-user intu-filter-new-user' : 'intu-filter-user'),
            href: "javascript:pluginFilterUser('" + displayName + "')",
            _displayName: displayName.replace(/'/g, "\\'")
        }).text(displayName + ' (1)');
        $('#intu-filter-users').append(linkUser);
    }
    else {
        incrementCount(elements.eq(0));
    }
}

function addPriorityFilter(name){
    var elements = $(".intu-filter-priority[_displayName='" + name + "']");
    if(elements.length == 0){
        var link = $('<a />').attr({
            class: 'intu-filter-priority',
            href: "javascript:pluginFilterPriority('" + name + "')",
            _displayName: name
        }).text(name + ' (1)');
        $('#intu-filter-priorities').append(link);
    }
    else {
        incrementCount(elements.eq(0));
    }
}

function addFixVersionFilter(name){
    if(name == '') return;

    var elements = $(".intu-filter-fixversion[_displayName='" + name + "']");
    if(elements.length == 0){
        var link = $('<a />').attr({
            class: 'intu-filter-fixversion',
            href: "javascript:pluginFilterFixVersion('" + name + "')",
            _displayName: name
        }).text(name + ' (1)');
        $('#intu-filter-fixversion').append(link);
    }
    else {
        incrementCount(elements.eq(0));
    }
}

function addIssueTypeFilter(name){
    var elements = $(".intu-filter-issuetype[_displayName='" + name + "']");
    if(elements.length == 0){
        var link = $('<a />').attr({
            class: 'intu-filter-issuetype',
            href: "javascript:pluginFilterIssuetype('" + name + "')",
            _displayName: name
        }).text(name + ' (1)');
        $('#intu-filter-issuetype').append(link);
    }
    else {
        incrementCount(elements.eq(0));
    }
}

function issueLinkJsHtml(issueKey, cssClass){
    var anchor = $('<a />').attr({
        href: "javascript:void(0);",
        class: cssClass + " issueLink"
    });
    return anchor;
}

function issueLinkHtmlOnGithub(issueKey, cssClass){
    var anchor = $('<a />').attr({
        href: "https://jira.intuit.com/browse/" + issueKey,
        target: "_blank",
        class: cssClass
    });
    return anchor;
}

function issueLinkHtml(issueKey, cssClass){
    var anchor = $('<a />').attr({
        href: "https://" + window.location.hostname + "/browse/" + issueKey,
        target: "_blank",
        class: cssClass
    });
    return anchor;
}

function commentDisplayHtml(comment){
    var body = comment.body;
    body = body.replace('[~', '').replace(']', '');
    return body + " (" + comment.author.displayName + " on " + (new Date(comment.updated)).toLocaleString() + ")<br>";
}

function mentionHtml(issueKey, lastComment, summary){
    var name = myName();
    var mentions = $('<p>' + lastComment.body + '</p>').find('a.user-hover');
    for(var iMnt=0; iMnt < mentions.length; iMnt++){
        if(name == $(mentions[iMnt]).attr('rel')){
            $('#intu-mention').append(issueLinkHtml(issueKey, 'mention').text(issueKey));
            $('#intu-mention').append(' ' + summary);
            $('#intu-mention').append($(commentDisplayHtml(lastComment)));
            $('#intu-mention').append('<br>');

            var mCount = $('#pluginMentionCount').text();
            if(mCount == '') mCount = '0';
            var nextCount = parseInt(mCount) + 1;
            $('#pluginMentionCount').text(nextCount)
        }
    }

    if(lastComment.body.indexOf('[~' + name + ']') >= 0)
    {
        $('#intu-mention').append(issueLinkHtml(issueKey, 'mention').text(issueKey));
        $('#intu-mention').append(' ' + summary + '<br>');
        $('#intu-mention').append(commentDisplayHtml(lastComment));
        $('#intu-mention').append('<br>');

        var mCount = $('#pluginMentionCount').text();
        if(mCount == '') mCount = '0';
        var nextCount = parseInt(mCount) + 1;
        $('#pluginMentionCount').text(nextCount)
    }

    $('#intu-mention').append("<a href='javascript:pluginClose();' class='close-button'>Close</a>");
}

function WorkStatus(name, columnId){
    this.name = name;
    this.columnId = columnId;
    this.count = 0;

    this.increment = function(){
        this.count++;
    }
}

function toDateFromTimezone(str){
  return new Date(Date.parse(str))
}

function daysDiffRound(older, newer){
    var timeDiff = Math.abs(newer.getTime() - older.getTime());
    var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return diffDays;
}

function daysDiffFromToday(olderDateStringWithTimeZone){
  var olderDate = toDateFromTimezone(olderDateStringWithTimeZone);
  var today = new Date();
  var weekend = countWeekendDays(olderDate, today);

  var timeDiff = Math.abs(today.getTime() - olderDate.getTime());
  var diffDays = timeDiff / (1000 * 3600 * 24);
  return diffDays - weekend;
}

function daysDiff(olderDateStringWithTimeZone, newerDateStringWithTimeZone){
  var newerDate = toDateFromTimezone(newerDateStringWithTimeZone);
  var olderDate = toDateFromTimezone(olderDateStringWithTimeZone);
  var weekend = countWeekendDays(olderDate, newerDate);

  var timeDiff = Math.abs(newerDate.getTime() - olderDate.getTime());
  var diffDays = timeDiff / (1000 * 3600 * 24) - weekend;
  return diffDays;
}

function day1AfterDay2(day1, day2){
  return toDateFromTimezone(day1) > toDateFromTimezone(day2);
}

function countWeekendDays( d0, d1 )
{
  var ndays = 1 + Math.round((d1.getTime()-d0.getTime())/(24*3600*1000));
  var nsaturdays = Math.floor( (d0.getDay()+ndays) / 7 );
  return 2*nsaturdays + (d0.getDay()==0) - (d1.getDay()==6);
}
