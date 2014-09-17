window.jiraPluginSort = function(dataColumnId) {
    var mylist = $('.ghx-column[data-column-id=' + dataColumnId + ']');
    var listitems = mylist.find('.ghx-issue').get();
    listitems.sort(function(a, b) {
        var compA = $(a).attr('_displayName');
        var compB = $(b).attr('_displayName');
        return (compA < compB) ? -1 : (compA > compB) ? 1 : 0;
    });
    $.each(listitems, function(idx, itm) {
        mylist.append(itm);
    });
}
