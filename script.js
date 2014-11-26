window.sortAllJiraIssues = function(attr, order, valueType) {
    $('.ghx-columns .ghx-column').each(function() {
        var mylist = $(this);
        var listitems = mylist.find('.ghx-issue').get();
        listitems.sort(function(a, b) {
            var compA;
            var compB;
            if (valueType == 'string') {
                compA = $(a).attr(attr);
                compB = $(b).attr(attr);
            }
            else if (valueType == 'integer'){
                compA = parseInt($(a).attr(attr));
                compB = parseInt($(b).attr(attr));
            }

            if (order == 'asc') {
                return (compA < compB) ? -1 : (compA > compB) ? 1 : 0;
            }
            else {
                return (compA > compB) ? -1 : (compA < compB) ? 1 : 0;
            }
        });
        $.each(listitems, function(idx, itm) {
            mylist.append(itm);
        });
    });
}

var hidingHeight = 0;

function pluginAdjustSpace(){
    var mainHeight = 0;
    if($('#ghx-plan-group').length == 0){
        mainHeight = pluginToInt($('#ghx-work').css('height'));
    }
    else {
        mainHeight = pluginToInt($('#ghx-plan-group').css('height'));
    }

    if ($('#announcement-banner').is(":visible")){
        $('#ghx-report, #ghx-work, #ghx-plan, #ghx-plan-group').css('height', mainHeight - hidingHeight);
    }
    else {
        $('#ghx-report, #ghx-work, #ghx-plan, #ghx-plan-group').css('height', mainHeight + hidingHeight);
    }

    // Work View
    if($('#ghx-plan-group').length == 0){
        GH.SwimlaneStalker.poolStalker(); // Move the work view column header up
    }
}

function pluginMaxSpace(){
    if (hidingHeight == 0) {
        hidingHeight = $('#announcement-banner').height() + $('header .aui-header').height() + $('#ghx-operations').height();
    }

    $('#announcement-banner, #header, #ghx-operations').toggle();
    if ($('#announcement-banner').is(":visible")){
        hidingHeight = 0;
    }

    pluginAdjustSpace();
}

function pluginToInt(str){
    return parseInt(str.substring(0, str.length - 2));
}

function pluginCardsWatching(myName){
    $("div.ghx-issue").not("div.ghx-issue[_watchers*='" + myName + "']").toggle();
}

function pluginToggleStatus(){
    $('#intu-help, #intu-filter-users').hide();
    $('#intu-status').toggle();
}

function pluginHelp(){
    $('#intu-status, #intu-filter-users').hide();
    $('#intu-help').toggle();
}

function pluginShowUserFilter(){
    $('#intu-status, #intu-help').hide();
    $('#intu-filter-users').toggle();
}

function pluginCloseAll(){
    $('#intu-status, #intu-help, #intu-filter-users').hide();
}

function pluginMention(){
    $('#intu-mention').toggle();
}

function pluginFilterUser(name){
    $('.ghx-issue, .ghx-issue-compact').hide();
    $(".ghx-issue[_displayName='" + name + "']").show();
    $(".ghx-issue-compact[_displayName='" + name + "']").show();
}

function pluginClearUserFilter(){
    $('.ghx-issue, .ghx-issue-compact').show();
}

$('#work-toggle, #plan-toggle').on('click', function(){
    hidingHeight = 0;
    $('#announcement-banner, #header, #ghx-operations').show();
});

$(window).resize(function() {
    setTimeout(function(){pluginAdjustSpace()}, 1000);
});
