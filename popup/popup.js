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

// Utility functions
const mkEl = typ => document.createElement(typ)//.bind(document);
const elById = id => document.getElementById(id);

function url(path){
    return "https://usaco.oviyan.tech" + path;
}

var loadingContainer;
async function performRequest(method, path, data, suppressErrors){
    loadingContainer.classList.remove("none");
    data.method = method;
    data.headers = {"Content-Type": "application/json"};
    if (data.token){
        data.headers["Authorization"] = `Bearer ${data.token}`;
        delete data.token;
    }
    if (data.body)
        data.body = JSON.stringify(data.body);
    let response;
    try {
        response = await fetch(url(path), data);
    } catch (err) {
        loadingContainer.classList.add("none");
        if (!suppressErrors){
            console.log(`Error encountered when performing ${method} ${path} :\n`, err);
            showError(GENERAL_ERR_MSG);
        }
        return null;
    }
    data = await response.json();
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
        return true;
    }
    return true;
}

// Section transition functions

let currentSection;

function showSection(el){
    requestAnimationFrame(() => {
        errorContainer.classList.add("none");
        loadingContainer.classList.add("none");
        el = elById(el);
        el.classList.remove("none");
        requestAnimationFrame(() => el.classList.remove("hidden"));
        currentSection = el;
    });
}

function switchSection(to){
    errorContainer.classList.add("none");
    loadingContainer.classList.add("none");
    if (currentSection){
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
    const li = mkEl("li");

    const div = mkEl("div");
    div.classList.add("name-container");
    const span = mkEl("span");
    span.classList.add("name");
    span.textContent = fname;

    const solveCount = mkEl("ul");
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

    const chevronContainer = mkEl("div");
    chevronContainer.classList.add("chevron-container");
    chevronContainer.addEventListener("mouseenter", () => {
        solveCount.style.zIndex = 10;
        solveCount.classList.remove("none");
        requestAnimationFrame(() => solveCount.style.opacity = 1);
    });
    chevronContainer.addEventListener("mouseleave", () => {
        solveCount.style.opacity = 0;
        setTimeout(() => {
            solveCount.style.zIndex = -1;
            solveCount.classList.add("none");
            solveCount.classList.remove("last-solve-count");
        }, 300);
    });

    const chevron = mkEl("img");
    chevron.classList.add("chevron");
    chevron.classList.add("last-chevron");
    chevron.src = "../assets/chevron.svg";

    chevronContainer.appendChild(chevron);
    chevronContainer.appendChild(solveCount);
    div.appendChild(chevronContainer);
    div.appendChild(span);
    li.appendChild(div);

    const btn = mkEl("button");
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
    if (!followData.following.includes(to_unfollow)) return;
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
    }
}

// Show the main page

async function mainPageSequence(token, requestFailCallback){
    errorContainer.classList.add("none");
    if ((await ensureDataExists(token)) == false){
        requestFailCallback();
        return;
    }
    elById("current-user").textContent = username;
    followList.innerHTML = "";
    for (fname of followData.following)
        addFollower(fname);
    switchSection("main-page");
}

// Event listener for signup/login button click

async function submitForm(path){
    errorContainer.classList.add("none");
    const username = elById("username").value.trim();
    const password = elById("password").value.trim();
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
            await mainPageSequence(data.token, () => showError(GENERAL_ERR_MSG));
        }
    }
}

var newUsername, newPassword, newPasswordConfirm;
let deleteBtnClicked = false;

document.addEventListener('DOMContentLoaded', () => {
    const elements = [
        "follow-list", "error-container", "loading-container",
        "new-username", "new-password", "new-password-confirm"
    ]
    for (const el of elements)
        window[el.replace(/-./g, x=>x[1].toUpperCase())] = elById(el);
    chrome.storage.sync.get(["token"]).then(result => {
        if (typeof result.token === "string")
            mainPageSequence(result.token, () => switchSection("login-page"));
        else
            switchSection("login-page");
    });

    elById("signup-btn").addEventListener("click", () => submitForm("/users"));
    elById("login-btn").addEventListener("click", () => submitForm("/token"));

    elById("logout-btn").addEventListener("click", () => {
        chrome.storage.sync.get(["token"]).then(result => {
            if (typeof result.token === "string"){
                performRequest("DELETE", "/token", {token: result.token}, true);
                chrome.storage.sync.remove(["token"]);
            }
            followData = undefined; username = undefined;
            switchSection("login-page");
        });
    });

    elById("follow-btn").addEventListener("click", async () => {
        errorContainer.classList.add("none");
        const followInput = elById("req-name");
        const to_follow = followInput.value.trim();
        if (!to_follow) return;
        if (to_follow == elById("current-user").textContent){
            followInput = "";
            return showError("You may not follow yourself.");
        }
        const result = await chrome.storage.sync.get(["token"]);
        if (typeof result.token === "string"){
            if ((await ensureDataExists(result.token)) === false)
                return;
            if (followData.following.includes(to_follow)){
                followInput = "";
                return showError("You are already following this user.");
            }
            const data = await performRequest("POST", "/follows", {
                token: result.token, body: {username: to_follow}
            });
            if (data !== null) {
                addFollower(to_follow);
                followInput.value = "";
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
            }
        }
    });

    elById("settings-btn").addEventListener("click", () => switchSection("settings-page"));
    elById("back-btn").addEventListener("click", () => switchSection("main-page"));
    const deleteBtn = elById("delete-btn");
    deleteBtn.addEventListener("click", () => {
        if (deleteBtnClicked){
            chrome.storage.sync.get(["token"]).then(async (result) => {
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
            deleteBtnClicked = true;
            deleteBtn.textContent = "Confirm Deletion";
            setTimeout(() => {
                deleteBtnClicked = false;
                deleteBtn.textContent = "Delete Account";
            }, 5000);
        }
    });
    elById("save-btn").addEventListener("click", async () => {
        const body = {};
        const newName = newUsername.value.trim();
        const newPass = newPassword.value.trim();
        const confirmPass = newPasswordConfirm.value.trim();
        if (newName && newName !== username){
            if (newName.length < 2 || newName.length > 32)
                return showError("Username must be between 2 and 32 characters");
            body.name = newName;
        }
        if (newPass){
            if (newPass.length < 8 || newPass.length > 64)
                return showError("Password must be between 8 and 64 characters");
            if (newPass !== confirmPass)
                return showError("Passwords do not match");
            body.password = newPass;
        }
        if (!body.name && !body.password) return;
        const token = (await chrome.storage.sync.get(["token"])).token;
        if (typeof token === "string"){
            const data = await performRequest("PATCH", "/users", {token, body});
            if (data === null) return;
            await chrome.storage.sync.set({token: data.token});
            if (newName && newName !== username){
                username = newName;
                elById("current-user").textContent = newName;
            }
            newPassword.value = "";
            newPasswordConfirm.value = "";
        }
    });
});