/*
MIT License

Copyright (c) 2023 Oviyan Gandhi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use strict";
const EXTENSION_ID = "jmlpdjciabnplpimhafibghkcpjckblh";
let loc, followData, userData, currentlyUpdating = false, chevronURL;
const validURL = /https\:\/\/usaco\.guide\/(bronze|silver|gold|plat|adv)\/(.+)/;

// this exists because I am too lazy to implement all the service-worker stuff
const icons = {
    "Solved": {
        order: 1,
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5 text-green-400"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg>`
    },
    "Solving": {
        order: 2,
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5 text-orange-500"><path d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"></path></svg>`
    },
    "Reading": {
        order: 3,
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5 text-yellow-300"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"></path></svg>`
    },
    "Reviewing": {
        order: 4,
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5 text-red-500"><path fill-rule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"></path></svg>`
    },
    "Skipped": {
        order: 5,
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5 text-blue-400"><path fill-rule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clip-rule="evenodd"></path><path fill-rule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>`
    },
    "Ignored": {
        order: 6,
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5 text-purple-400"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>`
    },
    "Not Attempted": {
        order: 7,
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="rgb(55, 65, 81)" class="h-5 w-5"><circle cx="10" cy="10" r="10" /></svg>`,
    },
    get: function(prop) {
        const span = document.createElement("span");
        span.title = prop;
        if (prop === "Not Started")
            prop = "Not Attempted";
        if (prop === "Practicing")
            prop = "Solving";
        if (prop === "Complete")
            prop = "Solved";
        span.innerHTML = this[prop].html;
        span.dataset.order = this[prop].order;
        span.classList.add("follow-list-item-img");
        return span;
    }
};

// Get a list of people who are being followed with progress set to "Not Attempted"
function getDefaultList(){
    const defaultList = document.createElement("ul");
    defaultList.classList.add("follow-list");
    for (const follow of followData.following){
        const li = document.createElement("li");
        li.classList.add("follow-list-item");
        li.appendChild(icons.get("Not Attempted"));
        const div = document.createElement("div");
        const span = document.createElement("span");
        span.textContent = follow;
        li.dataset.username = follow;
        div.classList.add("follow-list-item-name-date");
        div.appendChild(span);
        li.appendChild(div);
        defaultList.appendChild(li);
    }
    return defaultList;
}

// Show the follow list with the progress of problems/modules (attr)
function showFollowList(attr, getOffset){
    return function(){
        const list = getDefaultList();
        const offset = getOffset(this);
        list.style.top = `${offset.top}px`;
        list.style.left = `${offset.left}px`;
        if (this.dataset.id in followData[attr]){
            const data = followData[attr][this.dataset.id];
            for (const li of list.children){
                if (li.dataset.username in data){
                    li.firstChild.replaceWith(icons.get(
                        data[li.dataset.username].progress
                    ));
                    li.firstChild.dataset.lastUpdated = data[li.dataset.username].lastUpdated;
                    const span = document.createElement("span");
                    span.textContent = (new Date(data[li.dataset.username].lastUpdated * 1000)).toLocaleDateString();
                    span.classList.add("follow-list-item-date");
                    li.lastChild.appendChild(span);
                }
            }
        }
        // sort by progress, then by time
        [...list.children]
            .sort((a, b) => {
                return (
                    (a.firstChild.dataset.order > b.firstChild.dataset.order)
                    || (
                        a.firstChild.dataset.order == b.firstChild.dataset.order &&
                        a.firstChild.dataset.lastUpdated > b.firstChild.dataset.lastUpdated
                    )
                )
                ? 1 : -1
            })
            .forEach(node => list.appendChild(node));
        this.appendChild(list);
        requestAnimationFrame(() => list.style.opacity = 1);
    }
}

function hideFollowList(){
    const list = this.lastChild;
    list.style.opacity = 0;
    setTimeout(() => list.remove(), 300);
}

function getFollowListBtn(onmouseenter){
    const btn = document.createElement("div"); // >:)
    const img = document.createElement("img");
    img.src = chevronURL;
    img.classList.add("follow-list-btn-img");
    btn.appendChild(img);
    btn.classList.add("follow-list-btn");
    btn.addEventListener("mouseenter", onmouseenter.bind(btn));
    btn.addEventListener("mouseleave", hideFollowList.bind(btn));
    return btn;
}

function showFollowerProgressCallback(moduleID){
    const problems = [...document.getElementsByTagName("tr")].filter(e => e.id.startsWith("problem-"));
    problems.forEach(el => {
        const btn = getFollowListBtn(showFollowList("problems", el => {
            const rect = el.getBoundingClientRect();
            return {
                left: rect.left + window.scrollX,
                top: rect.top + window.scrollY + 30
            };
        }));
        btn.dataset.id = el.id.slice(8);
        el.firstChild.firstChild.prepend(btn);
    });
    document.querySelectorAll('[id^="headlessui-menu-button"].rounded-md.shadow-sm')
        .forEach(el => {
            // kinda wonky
            const btn = getFollowListBtn(showFollowList("modules", () => {return {left: 0, top: 40};}));
            btn.dataset.id = moduleID;
            btn.style.marginTop = "0.5rem";
            btn.style.fontSize = "1rem";
            el.parentElement.style.display = "inline-flex";
            el.parentElement.prepend(btn);
        });
}

function showFollowerProgress(moduleID){
    if (!chevronURL)
        chrome.runtime.sendMessage(EXTENSION_ID, {type: "CHEVRON_URL"}, response => {
            chevronURL = response.url;
            showFollowerProgressCallback(moduleID);
        });
    else showFollowerProgressCallback(moduleID);
}

// add the follow list buttons whenever the page changes
setInterval(async () => {
    const res = validURL.exec(location.href);
    if (currentlyUpdating || location.href === loc || res === null)
        return;
    loc = location.href;
    if (!followData){
        currentlyUpdating = true;
        chrome.runtime.sendMessage(EXTENSION_ID, {type: "DATA_REQUEST"}, response => {
            currentlyUpdating = false;
            if (!response.success)
                return;
            followData = response.data.followData;
            userData = response.data.userData.progress;
            showFollowerProgress(res[2].split("?")[0]);
        });
    } else showFollowerProgress(res[2].split("?")[0]);
}, 2000);

function getLatestFormatted(data, type){
    const keyName = `${type}ID`;
    let latest = {};
    for (const obj of data){
        if (!(obj[keyName] in latest) || latest[obj[keyName]].timestamp < obj.timestamp){
            latest[obj[keyName]] = obj;
        }
    }
    for (const key in latest)
        latest[key] = {
            id: latest[key][keyName], progress: latest[key][`${type}Progress`],
            lastUpdated: Math.floor(latest[key].timestamp/1000)
        };
    return latest;
}

function getChanges(prev, curr){
    const changes = [];
    for (const key in curr){
        if (!(key in prev) || curr[key].progress !== prev[key].progress)
            changes.push(curr[key]);
    }
    return changes;
}

function getAndUpdateChanges(curr){
    const problemsUpdated = getChanges(userData.problems, curr.problems);
    if (problemsUpdated.length > 0)
        chrome.runtime.sendMessage(EXTENSION_ID, {type: "PROBLEM_UPDATE", data: problemsUpdated});
    const modulesUpdated = getChanges(userData.modules, curr.modules);
    if (modulesUpdated.length > 0)
        chrome.runtime.sendMessage(EXTENSION_ID, {type: "MODULE_UPDATE", data: modulesUpdated});
    userData = curr;
    currentlyUpdating = false;
}

// gets the user data from the console and updates it on the webserver
const originalConsoleLog = console.log;
window.console.log = (...args) => {
    if (!currentlyUpdating && args.length > 1 && args[0] === "got new fb data"){
        currentlyUpdating = true;
        const curr = {
            modules: getLatestFormatted(args[1].userProgressOnModulesActivity, "module"),
            problems: getLatestFormatted(args[1].userProgressOnProblemsActivity, "problem")
        };
        if (userData === undefined){
            chrome.runtime.sendMessage(EXTENSION_ID, {type: "DATA_REQUEST"}, response => {
                if (response.success){
                    followData = response.data.followData;
                    userData = response.data.userData.progress;
                    getAndUpdateChanges(curr);
                }
            });
        } else getAndUpdateChanges(curr);
    }
    originalConsoleLog(...args);
}
