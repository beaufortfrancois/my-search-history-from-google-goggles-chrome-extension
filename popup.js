const API_BASE_URL = "https://www.google.com/goggles/a/api/json/moments/";
const NUMBER_OF_MOMENTS_PER_REQUEST = 10;
const PROFILE_URL = "https://profiles.google.com/beaufort.francois"
var start = 0;
var working = false;
var loadingTimeOut;
var oldScrollTop = 0;
var displayedResults = 0;
var numberResults = 0;

document.addEventListener('DOMContentLoaded', function () {
    // Initialize onClick search bar events
    document.getElementById("Moments").addEventListener('scroll', loadMore, false);
    document.getElementById("SearchList").addEventListener('click', clickSearch, false);
    document.getElementById("Input").addEventListener('focus', focusInput, false);
    document.getElementById("Input").addEventListener('search', search, false);
    document.getElementById("SearchStarredOnly").addEventListener('click', search, false);
    document.getElementById("SearchPublicOnly").addEventListener('click', search, false);
    document.getElementById("AdvancedSearch").addEventListener('click', displaySearchOptions, false);
    select(document.getElementById('MenuItemSearch'));
    // And retrieve Moments after
    search();
})

function displaySearchOptions() {
    document.getElementById('AdvancedSearch').classList.remove('visible');
    document.getElementById('SearchOptions').classList.add('visible');
}

function cleanMoments() {
    document.getElementById('Menu').classList.remove('visible');
    working = false;
    start = 0;
    numberResults = 0;
    displayedResults = 0;

    moments = document.getElementById('Moments');
    while (moments.firstChild) {
        moments.removeChild(moments.firstChild);
    }
}

function loadMore() {
    if (oldScrollTop <= this.scrollTop && displayedResults != numberResults && this.scrollHeight - this.clientHeight  <= this.scrollTop + 200) {
        getMoments();
    }
    oldScrollTop = this.scrollTop;
}

function openMomentTab() {
    chrome.tabs.create({url: this.dataset["url"]});
}

function search() {
    cleanMoments();
    getMoments();
}

function clickSearch() {
    document.getElementById('SearchList').classList.toggle('selected');
    document.getElementById('Menu').classList.toggle('visible');
}

function focusInput() {
    document.getElementById('SearchList').classList.remove('selected');
    document.getElementById('Menu').classList.remove('visible');
}

function select(menuItem) {
    var list = document.getElementById('List');
    list.innerHTML = menuItem.childNodes[0].innerHTML;
    document.getElementById('SearchList').classList.remove('selected');
    document.getElementById('Menu').classList.remove('visible');
    if (list.innerHTML == 'Search') {
        list.dataset['value'] = 'q';
        document.getElementById('Input').setAttribute('placeholder', 'Enter anything...');
    } else if (list.innerHTML == 'Tag') {
        list.dataset['value'] = 'tag';
        document.getElementById('Input').setAttribute('placeholder', 'Enter a tag...');
    } else if (list.innerHTML == 'Location') {
        list.dataset['value'] = 'locationText';
        document.getElementById('Input').setAttribute('placeholder', 'Enter a location...');
    }
}

function getMoments() {
    if (!working) {
        working = true;
        var param = '?'
        if (document.getElementById("SearchStarredOnly").checked) {
            param = param + 'starred=true' + '&'
        }
        if (document.getElementById("SearchPublicOnly").checked) {
            param = param + 'public=true' + '&'
        }
        searchSelectValue = document.getElementById('List').dataset['value'];
        searchValue = document.getElementById("Input").value;
        param = param + searchSelectValue+'=' + searchValue + '&'

        param = param + 'start=' + start + '&num=' + NUMBER_OF_MOMENTS_PER_REQUEST + '&'
        var request = new XMLHttpRequest();
        request.onreadystatechange = displayMoments;
        var url = API_BASE_URL + param;
        request.open("GET", url, false);
        request.send();
    }
}

function removeLoadingScrollbar() {
    document.getElementById("Moments").classList.remove("loading");
}

function openDeveloperTab() {
    chrome.tabs.create({url: PROFILE_URL});
}

function displayMoments() {
    if (this.readyState == 4) {
        if (this.status == 200) {
            moments = document.getElementById("Moments");
            // Add Loading Animation
            clearTimeout(loadingTimeOut);
            moments.classList.add('loading');
            loadingTimeOut = setTimeout(removeLoadingScrollbar, 700);

            var fragment = document.createDocumentFragment();
            var data = JSON.parse(this.responseText);

            // If there are no results
            if (start == 0 && data.gogglesQueries.length == 0) {
                cleanMoments();
                document.getElementById('NumberResults').innerHTML = "<span>"+ numberResults + "</span>";

                if (!document.getElementById("SearchStarredOnly").checked && !document.getElementById("SearchPublicOnly").checked && !document.getElementById("Input").value) {
                    // Looks like they did not activate search history!
                    var message = document.createElement("div");
                    message.classList.add('message');
                    message.innerHTML = "No results?<br/>It looks like you did not enable<br/><b>Search History</b> with this Google Account.";
                    moments.appendChild(message);
                }
                else {
                    // it's time to cheer me up!
                    var cheers = document.createElement("div");
                    cheers.classList.add('cheers');
                    cheers.innerHTML = "No results?<br/>Time to cheer up the <a href=\"#\">developer</a>!";
		    cheers.addEventListener('click', openDeveloperTab);
                    moments.appendChild(cheers);
                }

                working = false;
                return;
            }
            numberResults = data.numMatched;
            for (var i in data.gogglesQueries) {
                var m = data.gogglesQueries[i];

                displayedResults += 1;

                moment = document.createElement("div");
                moment.setAttribute("class", "Moment");

                // Create Moment Image
                image = document.createElement("img");
                image.setAttribute("src", m.imageUrl + "=s50");
                image.setAttribute("data-url", m.url);
                image.addEventListener("click", openMomentTab);
                moment.appendChild(image);

                topLine = document.createElement("div");
                topLine.setAttribute("class", "top");

                // Create Moment Source
                source = document.createElement("div");
                source.setAttribute('title', 'Source: ' + m.querySource);
                source.classList.add('source');
                topLine.appendChild(source);

                // Create Moment Shared
                shared = document.createElement("div");
                if (m.isShared) {
                    shared.classList.add('shared');
                    shared.setAttribute('title', 'This moment has been shared (or at least you clicked on "share results")');
                }
                else {
                    shared.classList.add('unshared');
                    shared.setAttribute('title', 'This moment has NOT been shared');
                }
                topLine.appendChild(shared);

                // Create Moment Star
                star = document.createElement("div");
                star.setAttribute('title', 'This moment has been rated: ' + m.starRating);
                if (m.isStarred) {
                    star.classList.add('starred');
                }
                else {
                    star.classList.add('unstarred');
                }
                topLine.appendChild(star);

                // Create Moment Title
                title = document.createElement("div");
                title.innerHTML = "<a href=\"#\">" + (m.bestTitle || '&lt;unnamed&gt;') + "</a>";
                title.setAttribute("class", "title");
                title.setAttribute("data-url", m.url);
                title.addEventListener("click", openMomentTab);
                topLine.appendChild(title);

                moment.appendChild(topLine);

                // Create Moment Date
                creationTime = document.createElement("div");
                var creationDate = new Date(parseInt(m.creationTime));
                creationTime.innerHTML = creationDate.toDateString();
                creationTime.setAttribute("class", "creationTime");
                moment.appendChild(creationTime);

                // Create Moment Location
                if (m.location) {
                    loc = document.createElement("div");
                    loc.setAttribute("class", "location");
                    loc.innerHTML = m.location.description + ' ';
                    moment.appendChild(loc);
                }

                // Create Moment Note
                if (m.note) {
                    note = document.createElement("div");
                    note.innerHTML = m.note;
                    note.setAttribute("class", "note");
                    moment.appendChild(note);
                }

                fragment.appendChild(moment);
                start = start + 1;
            }
            document.getElementById("Moments").appendChild(fragment);
            if (displayedResults != numberResults) {
                document.getElementById('NumberResults').innerHTML = "<span>" + displayedResults + ' of ' + numberResults + "</span>";
            } else {
                document.getElementById('NumberResults').innerHTML = "<span>" + numberResults + "</span>";
            }
            working = false;
        }
        else {
            cleanMoments();
            var message = document.createElement("div");
            message.classList.add('message');
            message.innerHTML = "Please sign in<br/>to your Google Goggles&trade; account";
            moments.appendChild(message);
        }
    }

}
