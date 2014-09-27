function loadOptions() {
    document.getElementById("githubUsername").value = localStorage["githubUsername"] || '';
    document.getElementById("githubPassword").value = localStorage["githubPassword"] || '';
    document.getElementById("githubUser").value = localStorage["githubUser"] || '';
    document.getElementById("githubRepo").value = localStorage["githubRepo"] || '';

}

function saveOptions() {
    var githubUsername  = document.getElementById("githubUsername").value;
    var githubPassword  = document.getElementById("githubPassword").value;
    var githubUser      = document.getElementById("githubUser").value;
    var githubRepo      = document.getElementById("githubRepo").value;
    localStorage["githubUsername"] = githubUsername;
    localStorage["githubPassword"] = githubPassword;
    localStorage["githubUser"] = githubUser;
    localStorage["githubRepo"] = githubRepo;
}

window.addEventListener("load", loadOptions);
document.getElementById("saveButton").addEventListener("click",saveOptions);
