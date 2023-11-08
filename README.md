# USACO-Together : Extension
The actual chrome extension for USACO-Together

What it adds:
- An arrow beside each problem listed in the module you are viewing, and also besides your module progress.
- On hovering over the arrow, you are able to view a list of the progress of the people that you follow, along with the date when the progress was updated.
- Similarly, in the popup, you are also able to check the number of problems that a person you follow has done today and the number of problems that the person has done in total.

How it works:
- When a user logs in from the popup, a token for the [API](https://github.com/USACO-Together/server "API's GitHub repository") is stored using `chrome.storage.sync`.
- A content script is used to inject JS into the usaco.guide page, which extracts user data from the console logs and sends it to the content script.
- API calls are made from the content script to keep the data which is received from the injected script updated in the database, and also to get the follow data and inject the arrows besides the problems and the module progress.
