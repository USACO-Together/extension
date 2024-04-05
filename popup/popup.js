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

// Logging
async function sendMessage(data){
    const [tab] = await chrome.tabs.query({url: "https://usaco.guide/*"});
    if (!tab) return null;
    try {
        return await chrome.tabs.sendMessage(tab.id, data);
    } catch {
        return null;
    }
}
const log = (message, level = "info") => sendMessage({type: "ADD_LOG", message, level});

// Utility functions
const mk = typ => document.createElement(typ);
const $ = id => document.getElementById(id);

function url(path){
    return "https://usaco.oviyan.tech" + path;
}

var loadingContainer;
async function performRequest(method, path, data, suppressErrors, showLoading = true){
    if (showLoading)
        loadingContainer.classList.remove("none");
    const token = data.token;
    delete data.token;
    let log_msg = `${method} ${path}\nData: ${JSON.stringify(data)}`;
    data.method = method;
    data.headers = {"Content-Type": "application/json"};
    if (token)
        data.headers["Authorization"] = `Bearer ${token}`;
    if (data.body)
        data.body = JSON.stringify(data.body);
    let response;
    try {
        response = await fetch(url(path), data);
    } catch (err) {
        log(`${log_msg}\nError: ${err}`, "error");
        loadingContainer.classList.add("none");
        if (!suppressErrors)
            showError(GENERAL_ERR_MSG);
        return null;
    }
    data = await response.json();
    let resp_str = "";
    for (const key in data){
        resp_str += `${key}: ${(typeof data[key] !== "object") ? data[key] : "[object]"}, `;
    }
    log(`${log_msg}\nResponse: {${resp_str.slice(0, -2)}}`);
    loadingContainer.classList.add("none");
    if (!response.ok){
        if (!suppressErrors){
            let err_msg = "";
            for (error of data.errors)
                err_msg += error.description + "\n";
            showError(err_msg.slice(0, -1));
        }
        return null;
    }
    return data;
}

// User Data

let followData, username;

async function ensureDataExists(token){
    if (followData === undefined || username === undefined){
        const data = await performRequest("GET", "/user_data", {token});
        if (data === null)
            return false;
        followData = data.followData;
        username = data.userData.username;
        newUsername.value = username;
    }
    return true;
}

// Section transition functions

let currentSection;

function showSection(el){
    requestAnimationFrame(() => {
        errorContainer.classList.add("none");
        loadingContainer.classList.add("none");
        el = $(el);
        el.classList.remove("none");
        requestAnimationFrame(() => el.classList.remove("hidden"));
        log(`Showing section ${el.id}`);
        currentSection = el;
    });
}

function switchSection(to){
    errorContainer.classList.add("none");
    loadingContainer.classList.add("none");
    if (currentSection){
        log(`Hiding section ${currentSection.id}`);
        currentSection.classList.add("hidden");
        setTimeout(() => {
            currentSection.classList.add("none");
            showSection(to);
        }, 1200);
    }
    else showSection(to);
}

// Error functions

var errorContainer;
const GENERAL_ERR_MSG = "Something went wrong, please try again later.";

function showError(err){
    errorContainer.textContent = err;
    errorContainer.classList.remove("none");
}

// Follow / Unfollow functions

var followList;

function addFollower(fname){
    log(`Adding follower ${fname}`);
    const li = mk("li");

    const div = mk("div");
    div.classList.add("name-container");
    const span = mk("span");
    span.classList.add("name");
    span.textContent = fname;

    const solveCount = mk("ul");
    solveCount.classList.add("solve-count");
    solveCount.classList.add("none");
    let tot = 0, today = 0;
    for (const problem of Object.values(followData.problems)){
        if (fname in problem && problem[fname].progress === "Solved"){
            tot++;
            const lastUpdated = new Date(problem[fname].lastUpdated*1000);
            if (lastUpdated.toLocaleDateString() === (new Date()).toLocaleDateString())
                today++;
        }
    }
    solveCount.innerHTML = `<div>Total Solved:\nSolved Today:</div><div style="margin-left: 10px;">${tot}\n${today}</div>`;

    const chevronContainer = mk("div");
    chevronContainer.classList.add("chevron-container");
    chevronContainer.addEventListener("mouseenter", () => {
        log(`Showing solve count for ${fname}`);
        solveCount.style.zIndex = 10;
        solveCount.classList.remove("none");
        requestAnimationFrame(() => solveCount.style.opacity = 1);
    });
    chevronContainer.addEventListener("mouseleave", () => {
        log(`Hiding solve count for ${fname}`);
        solveCount.style.opacity = 0;
        setTimeout(() => {
            solveCount.style.zIndex = -1;
            solveCount.classList.add("none");
            solveCount.classList.remove("last-solve-count");
        }, 300);
    });

    const chevron = mk("img");
    chevron.classList.add("chevron");
    chevron.classList.add("last-chevron");
    chevron.src = "../assets/chevron.svg";

    chevronContainer.appendChild(chevron);
    chevronContainer.appendChild(solveCount);
    div.appendChild(chevronContainer);
    div.appendChild(span);
    li.appendChild(div);

    const btn = mk("button");
    btn.textContent = "Unfollow";
    btn.classList.add("unfollow-btn");
    btn.addEventListener("click", unfollow);

    li.appendChild(btn);
    followList.appendChild(li);

    if (followList.lastChild.previousElementSibling !== null){
        const prvCnt = followList.lastChild.previousElementSibling.getElementsByClassName("solve-count")[0];
        const prvChevron = prvCnt.previousElementSibling;
        prvChevron.classList.remove("last-chevron");
        prvChevron.classList.add("middle-chevron");
        prvCnt.style.top = "40px";
    }
    solveCount.style.top = "-50px";

    requestAnimationFrame(() => {
        li.style.opacity = 1;
        li.style.top = "0px";
        log(`Added follower ${fname}`);
    });
}

async function unfollow(){
    errorContainer.classList.add("none");
    const result = await chrome.storage.sync.get(["token"]);
    if (result.token === undefined)
        return showError("Please log in again.");
    if ((await ensureDataExists(result.token)) === false)
        return;
    const to_unfollow = this.parentElement.getElementsByClassName("name")[0].textContent;
    log(`Trying to unfollow ${to_unfollow}`);
    if (!followData.following.includes(to_unfollow)){
        log(`Already not following ${to_unfollow}`);
        return;
    }
    const data = await performRequest("DELETE", "/follows", {
        token: result.token, body: {username: to_unfollow}
    });
    if (data !== null) {
        this.parentElement.style.top = "-50px";
        this.parentElement.style.opacity = 0;
        window.setTimeout.bind(window)(this.parentElement.remove.bind(this.parentElement), 500);
        followData.following = followData.following.filter(name => name != to_unfollow);
        for (const problem of Object.values(followData.problems))
            delete problem[to_unfollow];
        for (const module of Object.values(followData.modules))
            delete module[to_unfollow];
        log(`Unfollowed ${to_unfollow}`);
    }
}

// Show the main page

async function mainPageSequence(token, requestFailCallback){
    errorContainer.classList.add("none");
    if ((await ensureDataExists(token)) == false){
        requestFailCallback();
        return;
    }
    $("current-user").textContent = username;
    followList.innerHTML = "";
    for (fname of followData.following)
        addFollower(fname);
    switchSection("main-page");
}

// Event listener for signup/login button click

async function submitForm(path){
    errorContainer.classList.add("none");
    const username = $("username").value.trim();
    const password = $("password").value.trim();
    const log_msg = `submit form at ${path} with username ${username} and password ${
        (typeof password === "string" ? (
            "of " + ((password.length < 8 || password.length > 64) ? "in" : "") + "valid length"
        ) : password)
    }`
    log(`Trying to ${log_msg}`);
    if (!username && !password)
        showError("Username and password cannot be empty");
    else if (!username)
        showError("Username cannot be empty");
    else if (!password)
        showError("Password cannot be empty");
    else if (username.length < 2 || username.length > 32)
        showError("Username must be between 2 and 32 characters");
    else if (password.length < 8 || password.length > 64)
        showError("Password must be between 8 and 64 characters");
    else {
        const data = await performRequest("POST", path, {body: {name: username, password: password}});
        if (data !== null) {
            await chrome.storage.sync.set({token: data.token});
            log(`Successfully ${log_msg}`);
            await mainPageSequence(data.token, () => showError(GENERAL_ERR_MSG));
        }
    }
}

var newUsername, newPassword, newPasswordConfirm, followInput, autocompleteList;
let deleteBtnClicked = false, lastInput = Infinity, showAutocompleteList = false;

function setFollowInputValue(value = ""){
    followInput.value = value;
    showAutocompleteList = false;
    autocompleteList.classList.add("none");
}

document.addEventListener("DOMContentLoaded", () => {
    // General
    const elements = [
        "follow-list", "error-container", "loading-container",
        "new-username", "new-password", "new-password-confirm",
        "follow-input", "autocomplete-list"
    ];
    for (const el of elements)
        window[el.replace(/-./g, x=>x[1].toUpperCase())] = $(el);

    chrome.storage.sync.get(["token"]).then(result => {
        if (typeof result.token === "string")
            mainPageSequence(result.token, () => switchSection("login-page"));
        else
            switchSection("login-page");
    });

    $("logs-btn").addEventListener("click", async () => {
        const content = await sendMessage({type: "EXPORT_LOGS"});
        if (content === null)
            return showError(GENERAL_ERR_MSG);
        const blob = new Blob([content], {level: "text/plain"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "usaco-together.log";
        a.click();
        URL.revokeObjectURL(url);
    });

    // Login Page
    $("signup-btn").addEventListener("click", () => submitForm("/users"));
    $("login-btn").addEventListener("click", () => submitForm("/token"));


    // Main Page
    $("logout-btn").addEventListener("click", () => {
        chrome.storage.sync.get(["token"]).then(result => {
            log("Logging out...");
            if (typeof result.token === "string"){
                performRequest("DELETE", "/token", {token: result.token}, true);
                chrome.storage.sync.remove(["token"]);
            }
            followData = undefined; username = undefined;
            switchSection("login-page");
        });
    });

    $("follow-btn").addEventListener("click", async () => {
        errorContainer.classList.add("none");
        const to_follow = followInput.value.trim();
        log(`Trying to follow ${to_follow}`);
        if (!to_follow) return;
        if (to_follow == $("current-user").textContent){
            setFollowInputValue();
            return showError("You may not follow yourself.");
        }
        const result = await chrome.storage.sync.get(["token"]);
        if (typeof result.token === "string"){
            if ((await ensureDataExists(result.token)) === false)
                return;
            if (followData.following.includes(to_follow)){
                setFollowInputValue();
                log(`Already following ${to_follow}`);
                return showError("You are already following this user.");
            }
            const data = await performRequest("POST", "/follows", {
                token: result.token, body: {username: to_follow}
            });
            if (data !== null) {
                setFollowInputValue();
                followData.following.push(to_follow);
                for (const problem in data.problems){
                    if (!(problem in followData.problems))
                        followData.problems[problem] = {};
                    followData.problems[problem][to_follow] = data.problems[problem];
                }
                for (const module in data.modules){
                    if (!(module in followData.modules))
                        followData.modules[module] = {};
                    followData.modules[module][to_follow] = data.modules[module];
                }
                addFollower(to_follow);
            }
        }
    });

    followInput.addEventListener("input", () => {
        showAutocompleteList = false;
        autocompleteList.classList.add("none");
        if (!followInput.value.trim()){
            lastInput = Infinity;
            return;
        }
        lastInput = Date.now();
        setTimeout(async () => {
            if (Date.now() - lastInput >= 1000){
                lastInput = Infinity;
                showAutocompleteList = true;
                const res = await chrome.storage.sync.get(["token"]);
                const data = await performRequest(
                    "GET", `/autocomplete?name=${followInput.value.trim()}`,
                    {token: res.token}, false, false
                );
                autocompleteList.replaceChildren();
                for (const user of data.users){
                    const li = document.createElement("li");
                    li.textContent = user;
                    li.addEventListener("click", () => setFollowInputValue(user));
                    autocompleteList.appendChild(li);
                }
                autocompleteList.classList.remove("none");
            }
        }, 1000);
    });
    $("follow-container").addEventListener("mouseenter", () => {
        if (showAutocompleteList)
            autocompleteList.classList.remove("none");
    });
    $("follow-container").addEventListener("mouseleave", () => {
        autocompleteList.classList.add("none");
    });


    // Settings Page
    $("settings-btn").addEventListener("click", () => switchSection("settings-page"));
    $("back-btn").addEventListener("click", () => switchSection("main-page"));

    const deleteBtn = $("delete-btn");
    deleteBtn.addEventListener("click", () => {
        if (deleteBtnClicked){
            chrome.storage.sync.get(["token"]).then(async (result) => {
                log("Deleting account...");
                if (typeof result.token === "string"){
                    const data = await performRequest("DELETE", "/users", {token: result.token});
                    if (data === null) return;
                    chrome.storage.sync.remove(["token"]);
                }
                followData = undefined; username = undefined;
                switchSection("login-page");
            });
        }
        else {
            log("Delete button clicked, waiting for conformation...");
            deleteBtnClicked = true;
            deleteBtn.textContent = "Confirm Deletion";
            setTimeout(() => {
                deleteBtnClicked = false;
                deleteBtn.textContent = "Delete Account";
            }, 5000);
        }
    });

    $("save-btn").addEventListener("click", async () => {
        const body = {};
        const newName = newUsername.value.trim();
        const newPass = newPassword.value.trim();
        const confirmPass = newPasswordConfirm.value.trim();
        log("Trying to save settings...");
        if (newName && newName !== username){
            log(`Trying to change username from ${username} to ${newName}`);
            if (newName.length < 2 || newName.length > 32){
                log(`${newName} is invalid`);
                return showError("Username must be between 2 and 32 characters");
            }
            body.name = newName;
        }
        if (newPass){
            log("Trying to change password...");
            if (newPass.length < 8 || newPass.length > 64){
                log("Password invalid");
                return showError("Password must be between 8 and 64 characters");
            }
            if (newPass !== confirmPass){
                log("Passwords do not match");
                return showError("Passwords do not match");
            }
            body.password = newPass;
        }
        if (!body.name && !body.password){
            log("No changes made to settings");
            return;
        }
        const token = (await chrome.storage.sync.get(["token"])).token;
        if (typeof token === "string"){
            const data = await performRequest("PATCH", "/users", {token, body});
            if (data === null) return;
            await chrome.storage.sync.set({token: data.token});
            if (newName && newName !== username){
                username = newName;
                $("current-user").textContent = newName;
            }
            newPassword.value = "";
            newPasswordConfirm.value = "";
            log("Successfully saved settings");
        }
    });
});