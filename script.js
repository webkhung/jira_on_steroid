window.sortAllJiraIssues = function(attr, order, valueType) {
    $('.ghx-columns .ghx-column, .ghx-has-issues').each(function() {
        var mylist = $(this);
        var listitems = mylist.find('.ghx-issue, .ghx-issue-compact').get();
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
    $("div.ghx-issue-compact").not("div.ghx-issue-compact[_watchers*='" + myName + "']").toggle();
}

function pluginToggleStatus(){
    $('#intu-release, #intu-filter-users, #intu-filter-components, #intu-mention, #intu-github').hide();
    $('#intu-status').toggle();
}

function pluginShowGithubDashboard(){
    $('#intu-release, #intu-filter-users, #intu-filter-components, #intu-mention').hide();
    $('#intu-github').toggle();
}

function pluginRelease(){
    $('#intu-status, #intu-filter-users, #intu-filter-components, #intu-mention, #intu-github').hide();
    $('#intu-release').toggle();
}

var lastEditPopup = '';
function checkACPopup(){
    jQuery(function($) {
        var textarea =  $('.jeditor_inst[name=customfield_13624]');
        if(textarea.length == 0) {
            lastEditPopup = '';
        }

        var ckeId = textarea.attr('id');
        var editor = CKEDITOR.instances[ckeId];

        if(editor !== undefined) {
            if(lastEditPopup != $('.jira-dialog-heading h2').text()){
                lastEditPopup = $('.jira-dialog-heading h2').text();
                convertToCheckboxesPopup();
            }
        }
    });
}

function checkACBrowse(){
    jQuery(function($) {
        if($('#field-customfield_13624 .verbose .flooded').length > 0){
            var html = $('#field-customfield_13624 .verbose .flooded').html();
            if(html == '' || html.indexOf('[]') > 0 || html.indexOf('[+]') > 0){
                convertToCheckboxesBrowse();
            }
        }
    });
}

function checkboxClicked(checkbox){
    jQuery(function($) {
        $(checkbox).attr('checked', $(checkbox).attr('checked') == 'checked' ? 'checked' : false);

        $newHtml = $($('.jira-dialog #ac_list').html());
        $newHtml.find('p').each(function(){

            if($(this).find('input').attr('checked') == 'checked'){
                $(this).find('input').remove();
                $(this).prepend('[+]');
            }
            else {
                $(this).find('input').remove();
                $(this).prepend('[]');
            }
        });
        newHtml = $newHtml[0].outerHTML;
        var editor = getEditor();
        editor.setData(newHtml);
    });
}

function AddNewCheckboxItem(){
    jQuery(function($) {
        var itemText = $('#checkbox_item_text').val();
        if(itemText == '') return;
        itemText = '<p>[]' + itemText + '</span></p>';

        var editor = getEditor();
        var html = editor.getData();

        var newHtml = '';
        if($(html).prop("tagName") != 'DIV'){
            html = '<div>' + html + '</div>';
        }
        $(html).find('p').each(function(){
            newHtml += '<p>' + $(this).html() + '</p>';
        });

        editor.setData(newHtml + itemText);

        convertToCheckboxesPopup();

        $('#checkbox_item_text').val('');
    });
}

function getTextarea(){
    var textarea =  jQuery('.jira-dialog .jeditor_inst[name=customfield_13624]');
    return textarea;
}

function getEditor(){
    var textarea = getTextarea();
    if(textarea.length == 0) return null;
    var ckeId = textarea.attr('id');
    var editor = CKEDITOR.instances[ckeId];
    return editor;
}

var intervalIdCheckPopupReady;

function triggerPopup(){
    jQuery(document).trigger({ type: 'keypress', which: "e".charCodeAt(0) });
    intervalIdCheckPopupReady = setInterval(function(){checkPopupReady()}, 2000);
}

function checkPopupReady(){
    console.log('------- checkPopupReady');
    var textarea = getTextarea();
    if(textarea == null || textarea.length == 0) return;
    clearTimeout(intervalIdCheckPopupReady);
    convertToCheckboxesPopup();
}

function convertToCheckboxesBrowse(){
    jQuery(function($) {
        var html = $('#field-customfield_13624 .verbose .flooded').html();
        var lines = html.split('\n');
        var newHtml = '';
        for(var i=0; i<lines.length; i++){
            var original = lines[i].trim();
            if(original.indexOf('[]') >= 0) {
                newHtml += original.replace('[]',"<input type=checkbox disabled>");
            }
            else if(original.indexOf('[+]') >= 0){
                newHtml += original.replace('[+]',"<input type=checkbox disabled checked>");
            }
        }

        if($('#ac_list').length == 0){
            jQuery('#customfield_13624-val').hide();
            jQuery('#customfield_13624-val').before('<div id=ac_list onclick="triggerPopup()">' + newHtml + '</div>');
        }
        else {
            $('#ac_list').html(newHtml);
        }
    });
}

function convertToCheckboxesPopup(){
    jQuery(function($) {
        console.log('----------- convertToCheckboxesPopup');

        var textarea = getTextarea();
        if(textarea == null) return;
        var editor = getEditor();

        // Hide the rich text editor
        $('.jeditor_inst[name=customfield_13624]').next().hide();

        // Get data
        var html = editor.getData();
        if($(html).prop("tagName") != 'DIV'){
            html = '<div>' + html + '</div>';
        }

        // Convert mark down to checkbox
        var newHtml = $(html);
        newHtml.find('p').each(function(index){
            var original = $(this).html();
            if(original.indexOf('[]') >= 0) {
                $(this).html("<input type=checkbox onclick='checkboxClicked(this)'>" + original.replace('[]',''));
            }
            else if(original.indexOf('[+]') >= 0){
                $(this).html("<input type=checkbox checked onclick='checkboxClicked(this)'>" + original.replace('[+]',''));
            }
        });
        newHtml = newHtml[0].outerHTML;

        if($('.jira-dialog #ac_list').length == 0){
            textarea.parent().prepend(
                '<div id=ac_list>' + newHtml + '</div>' +
                '<div style="margin-bottom:30px;">' +
                    '<input type="text" id="checkbox_item_text">' +
                    '<a href="javascript:AddNewCheckboxItem();">Add New</a>' +
                '</div>'
            );
        }
        else {
            $('.jira-dialog #ac_list').html(newHtml);
        }
    });
}

function pluginShowUserFilter(){
    pluginClose();
    $('#intu-filter-users').toggle();
}

function pluginShowComponentFilter(){
    pluginClose();
    $('#intu-filter-components').toggle();
}

function pluginMention(){
    pluginClose();
    $('#intu-mention').toggle();
}

function pluginFilterUser(name){
    $('.ghx-issue, .ghx-issue-compact').hide();
    $(".ghx-issue[_displayName='" + name + "']").show();
    $(".ghx-issue-compact[_displayName='" + name + "']").show();
}

function pluginFilterComponent(name){
    $('.ghx-issue, .ghx-issue-compact').hide();
    $(".ghx-issue[_componentName*='|" + name + "']").show();
    $(".ghx-issue-compact[_componentName*='|" + name + "']").show();
}

function pluginClearFilter(){
    $('.ghx-issue, .ghx-issue-compact').show();
}

function pluginClose(){
    $('#intu-side-menu > div').hide();
}
