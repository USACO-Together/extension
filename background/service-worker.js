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

// Utility Functions

function url(path){
    return "https://usaco.oviyan.tech" + path;
}

function getHeaders(){
    return {"Content-Type": "application/json", "Authorization": `Bearer ${token}`};
}

// Token value

let token;
chrome.storage.sync.get(["token"]).then(result => token = result.token);
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync" && changes.token !== undefined)
        token = changes.token.newValue;
});

// Common function for performing API requests

async function performRequest(sendResponse, path, data){
    data = data || {};
    data.headers = getHeaders();
    let response;
    try {
        response = await fetch(url(path), data);
    } catch {
        sendResponse({success: false, error: {code: "API_ERROR"}});
        return;
    }
    if (!response.ok){
        const resp = {success: false, error: {code: "API_ERROR", detail: await response.json()}};
        console.log(resp.error.detail);
        sendResponse(resp);
    }
    else
        sendResponse({success: true, data: await response.json()});
}

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (sender.origin !== "https://usaco.guide")
        return sendResponse({success: false, error: {code: "INVALID_ORIGIN"}});
    if (request.type === "CHEVRON_URL")
        // chrome.runtime.getURL() doesn't work for content scripts in main world :(
        return sendResponse({url: chrome.runtime.getURL("assets/chevron.svg")});
    if (!token)
        return sendResponse({success: false, error: {code: "NO_TOKEN"}});
    for (const type of ["problem", "module"]){
        if (request.type === `${type.toUpperCase()}_UPDATE`){
            const data = {method: "POST", body: {}};
            data.body[`${type}s`] = request.data;
            data.body = JSON.stringify(data.body);
            performRequest(sendResponse, `/${type}s`, data);
        }
    }
    if (request.type === "DATA_REQUEST")
        performRequest(sendResponse, "/user_data");
    return true;
});