chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.method == "getLocalStorage") {
        sendResponse({
            githubUsername: (localStorage['githubUsername'] || ''),
            githubPassword: (localStorage['githubPassword'] || ''),
            githubUser: (localStorage['githubUser'] || ''),
            githubRepo: (localStorage['githubRepo'] || '')
        });
    }
    else
        sendResponse({});
});
