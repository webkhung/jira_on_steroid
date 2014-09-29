window.sortJiraIssues = function(dataColumnId, attr, order, valueType) {
    var mylist = $('.ghx-column[data-column-id=' + dataColumnId + ']');
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
}


function pluginToggleStatus(){
    $('#intu-status').toggle();
}

function pluginMaxSpace(){
    var allHeight = $('#announcement-banner').height() + $('header').height() + $('#ghx-operations').height();

    $('#announcement-banner, #header, #ghx-operations').toggle();
    GH.SwimlaneStalker.poolStalker();


    var oldHeight = $('#ghx-work').css('height');
    var iOldHeight = parseInt(oldHeight.substring(0, oldHeight.length - 2));

    if ($('#announcement-banner').is(":visible")){
        var allHeight = $('#announcement-banner').height() + $('header').height() + $('#ghx-operations').height();
        $('#ghx-report, #ghx-work, #ghx-plan').css('height', iOldHeight - allHeight);
    }
    else {
        $('#ghx-report, #ghx-work, #ghx-plan').css('height', iOldHeight + allHeight);
    }
}

function pluginClose(){
    if ($('#intu-menu-actions').is(":visible")){
        $('#intu-menu-actions, #intu-status').hide();
        $('#intu-menu-toggle').html('>');
    }
    else {
        $('#intu-menu-actions').show();
        $('#intu-status').hide();
        $('#intu-menu-toggle').html('X');
    }
}
