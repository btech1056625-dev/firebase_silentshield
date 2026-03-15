chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "VERIFY_DATA") {
        fetch("http://13.237.72.150/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request.payload)
        })
        .then(res => res.json())
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // Keep channel open for async response
    }

    if (request.type === "FALLBACK_SUCCESS") {
        fetch("http://13.237.72.150/api/fallback-success", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request.payload)
        })
        .then(res => res.json())
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
});
