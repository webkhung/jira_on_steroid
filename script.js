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


function toggleStatus(){
    $('#intu-status-container').toggle();
}

function maxSpace(){
    $('#announcement-banner, #header, #ghx-operations').toggle();
    GH.SwimlaneStalker.poolStalker();
}
