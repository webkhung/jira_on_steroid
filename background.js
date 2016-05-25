chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.method == "getLocalStorage") {
        sendResponse({
            githubUsername: (localStorage['githubUsername'] || ''),
            githubPassword: (localStorage['githubPassword'] || ''),
            githubUser: (localStorage['githubUser'] || ''),
            githubRepo: (localStorage['githubRepo'] || ''),
            watchersNames: (localStorage['watchersNames'] || ''),
            hoverDescription: localStorage['hoverDescription'],
            lastComment: localStorage['lastComment'],
            relatedCards: localStorage['relatedCards'],
            fixVersion: localStorage['fixVersion'],
            ck1: localStorage['ck1'],
            ck2: localStorage['ck2'],
            ck3: localStorage['ck3'],
            ck4: localStorage['ck4'],
            ck5: localStorage['ck5'],
            ck6: localStorage['ck6'],
            ck7: localStorage['ck7'],
            ck8: localStorage['ck8'],
            ck9: localStorage['ck9'],
            ck10: localStorage['ck10']
        });
    }
    else if (request.method == "updateJiraBoard") {
        _gaq.push(['_trackEvent', request.id, 'updateJiraBoard']);
    }
    else
        sendResponse({});
});

(function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-38467111-5']);
