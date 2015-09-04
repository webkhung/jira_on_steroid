
document.addEventListener('DOMContentLoaded', function() {
//var jiraGithub = new JiraGithub();
//jiraGithub.test();

    chrome.runtime.sendMessage({method: "getLocalStorage", key: "settings"}, function(response) {
        var jiraGithub = new JiraGithub();
        localStorageSet = true;
        jiraGithub.initVariables(response);
        jiraGithub.getGithubIssues();
        console.log(response);
    });
});
