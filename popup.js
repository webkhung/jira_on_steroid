

document.addEventListener('DOMContentLoaded', function() {
    chrome.runtime.sendMessage({method: "getLocalStorage", key: "settings"}, function(response) {
//        var jiraGithub = new JiraGithub();
//        localStorageSet = true;
//        jiraGithub.initVariables(response);
//        jiraGithub.getGithubIssues();

        chrome.storage.sync.get('enabled', function(value) {
            setEnableButtonText(value.enabled);
        });

        $('#optionPage').attr('href', chrome.extension.getURL("options.html"));
    });

    $('#disable').click(function(e){
        var changeToEnabled = !$('#disable').data('enabled');
        chrome.storage.sync.set({'enabled': changeToEnabled}, function() {
            setEnableButtonText(changeToEnabled);
            if(changeToEnabled){
                $('#loadingMessage').html('<BR>JIRA on Steroids will start if you are on the JIRA scrumboard');
            }
        });
    });
});

function setEnableButtonText(enabled){
    if(enabled == true || enabled === undefined) {
        $('#disable').text('The plugin is enabled.  Click here to disable the plugin');
        $('#disable').data('enabled', true);
        chrome.browserAction.setIcon({ path : chrome.extension.getURL("images/icon.png") });
    }
    else {
        $('#disable').text('The plugin is disabled.  Click here to enable the plugin');
        $('#disable').data('enabled', false);
        chrome.browserAction.setIcon({ path : chrome.extension.getURL("images/icon_disabled.png") });
    }
}
