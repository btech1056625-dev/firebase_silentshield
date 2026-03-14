document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const domain = new URL(tab.url).hostname;
    
    chrome.storage.local.get([domain], (result) => {
        const data = result[domain];
        if (data) {
            updateUI(data.score, data.decision);
        } else {
            document.getElementById('status-text').innerText = "Analyzing Activity...";
        }
    });
});

function updateUI(score, decision) {
    const scoreText = document.getElementById('score-text');
    const statusText = document.getElementById('status-text');
    const scoreCircle = document.getElementById('score-circle');
    const alertBanner = document.getElementById('alert-banner');
    
    const percentage = Math.round(score * 100);
    scoreText.innerText = `${percentage}%`;
    
    // Update Score Circle and Text Colors
    scoreCircle.style.setProperty('--progress', `${percentage}%`);
    
    if (score < 0.5) {
        statusText.innerText = "🚫 Bot Detected";
        statusText.style.color = "#ef4444";
        scoreText.className = "score-inner score-danger";
        scoreCircle.className = "score-circle circle-danger";
        
        alertBanner.innerText = "⚠️ Critical: Blocked Session";
        alertBanner.className = "alert-banner danger";
    } else if (score < 0.8) {
        statusText.innerText = "⚠️ Low Confidence";
        statusText.style.color = "#f59e0b";
        scoreText.className = "score-inner score-warning";
        scoreCircle.className = "score-circle circle-warning";
        
        alertBanner.innerText = "⚠️ Warning: User Validation Required";
        alertBanner.className = "alert-banner";
    } else {
        statusText.innerText = "✅ Verified Human";
        statusText.style.color = "#4caf50";
        scoreText.className = "score-inner";
        scoreCircle.className = "score-circle"; // Uses default green from CSS
        alertBanner.className = "alert-banner hidden";
    }

    // Update Detail Values Dynamically
    updateDetails(score);
}

function updateDetails(score) {
    const entropy = document.getElementById('entropy-val');
    const interaction = document.getElementById('interaction-val');
    const friction = document.getElementById('friction-val');

    if (score >= 0.8) {
        entropy.innerText = "Natural";
        entropy.style.color = "#4caf50";
        interaction.innerText = "Human-like";
        interaction.style.color = "#4caf50";
        friction.innerText = "Minimal";
        friction.style.color = "#4caf50";
    } else if (score >= 0.5) {
        entropy.innerText = "Slight Deviation";
        entropy.style.color = "#f59e0b";
        interaction.innerText = "Erratic";
        interaction.style.color = "#f59e0b";
        friction.innerText = "Medium";
        friction.style.color = "#f59e0b";
    } else {
        entropy.innerText = "Synthetic";
        entropy.style.color = "#ef4444";
        interaction.innerText = "Mechanical";
        interaction.style.color = "#ef4444";
        friction.innerText = "High/Blocked";
        friction.style.color = "#ef4444";
    }
}
