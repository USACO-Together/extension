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

// gets the user data from the console and sends it to the content-script using a custom event
const originalConsoleLog = console.log;
window.console.log = (...args) => {
    if (args.length > 1 && args[0] === "got new fb data"){
        const curr = {
            modules: getLatestFormatted(args[1].userProgressOnModulesActivity, "module"),
            problems: getLatestFormatted(args[1].userProgressOnProblemsActivity, "problem")
        };
        const event = new CustomEvent("updateUserData", {detail: curr});
        document.dispatchEvent(event);
    }
    originalConsoleLog(...args);
}
