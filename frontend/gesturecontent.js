// --- 1. STATE VARIABLES FOR TRACKING ---
let totalMouseMoves = 0;
let clickCount = 0;
let scrollEvents = 0;
let keyCount = 0;

let lastMouseX = null, lastMouseY = null, lastMouseMoveTime = null;
let lastMouseSpeed = 0;
let mouseSpeeds = [];
let mouseAccelerations = [];
let mouseCurvatures = [];
let totalDistanceTravelled = 0;
let initialX = null, initialY = null;

let lastClickTime = null, clickIntervals = [];
let keyPressData = {}; // To track dwell time
let typingDwellTimes = [];
let lastKeyUpTime = null;
let typingFlightTimes = [];

const startTime = Date.now();
const SESSION_ID = "sess_" + Math.random().toString(36).substr(2, 9);

// --- 2. PASSIVE EVENT LISTENERS ---
document.addEventListener('mousemove', (e) => {
    totalMouseMoves++;
    const currentTime = Date.now();

    if (initialX === null) {
        initialX = e.clientX; initialY = e.clientY;
    }

    if (lastMouseX !== null && lastMouseY !== null && lastMouseMoveTime !== null) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const timeDiff = currentTime - lastMouseMoveTime;

        if (timeDiff > 0) {
            const currentSpeed = distance / timeDiff;
            mouseSpeeds.push(currentSpeed);
            totalDistanceTravelled += distance;

            const acceleration = (currentSpeed - lastMouseSpeed) / timeDiff;
            mouseAccelerations.push(acceleration);
            
            // Simple curvature approximation (change in angle)
            if (mouseSpeeds.length > 2) {
                const angle = Math.atan2(dy, dx);
                mouseCurvatures.push(angle);
            }
            lastMouseSpeed = currentSpeed;
        }
    }
    lastMouseX = e.clientX; lastMouseY = e.clientY;
    lastMouseMoveTime = currentTime;
});

document.addEventListener('click', () => {
    clickCount++;
    const currentTime = Date.now();
    if (lastClickTime !== null) clickIntervals.push(currentTime - lastClickTime);
    lastClickTime = currentTime;
});

document.addEventListener('scroll', () => { scrollEvents++; });

document.addEventListener('keydown', (e) => {
    keyCount++;
    const currentTime = Date.now();
    keyPressData[e.key] = currentTime;
    if (lastKeyUpTime !== null) {
        typingFlightTimes.push(currentTime - lastKeyUpTime);
    }
});

document.addEventListener('keyup', (e) => {
    const currentTime = Date.now();
    if (keyPressData[e.key]) {
        typingDwellTimes.push(currentTime - keyPressData[e.key]);
        delete keyPressData[e.key];
    }
    lastKeyUpTime = currentTime;
});

// --- 3. MATH HELPERS ---
const getAverage = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const getStdDev = (arr) => {
    if (arr.length < 2) return 0;
    const mean = getAverage(arr);
    return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length);
};
const getEntropy = (arr) => {
    if (!arr.length) return 0;
    const counts = {};
    arr.forEach(x => counts[x] = (counts[x] || 0) + 1);
    const probs = Object.values(counts).map(c => c / arr.length);
    return -probs.reduce((a, p) => a + p * Math.log2(p), 0);
};

// Simple font detection (count typical common fonts)
const getFontCount = () => {
    const fontList = ["Arial", "Verdana", "Times New Roman", "Courier New", "Georgia", "Comic Sans MS", "Impact"];
    return fontList.filter(f => document.fonts.check(`12px "${f}"`)).length + 10; // offset for basic system fonts
};

// --- 4. COMPILE PAYLOAD AND SEND TO BACKEND ---
function triggerVerification() {
    const sessionDuration = (Date.now() - startTime) / 1000;
    const totalInteractions = totalMouseMoves + clickCount + scrollEvents + keyCount;
    
    // Mapping 17 specific features for the ML model
    const mlPayload = {
        mouse_avg_velocity: getAverage(mouseSpeeds) * 10, // scale to match expected range
        mouse_acceleration_std: getStdDev(mouseAccelerations),
        mouse_curvature_entropy: getEntropy(mouseCurvatures.map(c => c.toFixed(1))),
        click_frequency: clickCount / sessionDuration,
        typing_dwell_time: getAverage(typingDwellTimes) / 1000, 
        typing_flight_time: getAverage(typingFlightTimes) / 1000,
        user_agent_entropy: 14.2, // Statistical constant for common browsers
        screen_resolution_variety: 1.0, 
        webgl_fingerprint_uniqueness: 0.95,
        font_count: getFontCount(),
        requests_per_second: totalInteractions / sessionDuration,
        session_duration: sessionDuration,
        navigation_entropy: 1.0,
        burstiness: getStdDev(clickIntervals) || 0.5,
        interaction_complexity: (totalMouseMoves * 0.1) + clickCount + scrollEvents,
        human_behavior_score: 0.85, // Hybrid heuristic starting point
        session_intensity: totalInteractions / 1000
    };

    const sessionFeatures = {
        session_id: SESSION_ID,
        domain: window.location.hostname,
        behavior: mlPayload
    };

    console.warn("🚀 SILENTSHIELD: Triggering verification now...", sessionFeatures);

    chrome.runtime.sendMessage({ type: "VERIFY_DATA", payload: sessionFeatures }, (response) => {
        if (chrome.runtime.lastError || !response.success) {
            console.error("Verification API call failed:", chrome.runtime.lastError || response.error);
            triggerFallbackUI();
        } else {
            handleDecision(response.data);
        }
    });
}

setTimeout(triggerVerification, 5000);

function handleDecision(response) {
    const domain = window.location.hostname;
    chrome.storage.local.set({
        [domain]: {
            score: response.score,
            decision: response.decision,
            timestamp: Date.now()
        }
    });

    if (response.decision === "ALLOW") {
        console.log("✅ Verified Human. Token Received:", response.token);
    }
    else if (response.decision === "BLOCK") {
        console.warn("🚫 Bot detected. Access Blocked.");
        window.location.href = chrome.runtime.getURL("fallback.html?reason=block");
    }
    else if (response.decision === "FALLBACK") {
        console.log("⚠️ Confidence low. Triggering Fallback UI...");
        triggerFallbackUI();
    }
}

function triggerFallbackUI() {
    const overlay = document.createElement('div');
    overlay.className = 'ml-verify-overlay';

    const box = document.createElement('div');
    box.className = 'ml-verify-box';
    box.innerHTML = `
        <div class="ml-verify-icon">
            <svg width="24" height="24" fill="none" stroke="#3b82f6" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
        </div>
        <h3 class="ml-verify-title">Security Verification</h3>
        <p class="ml-verify-desc">Our system needs a quick check. Please press and hold the button below.</p>
    `;

    const btnContainer = document.createElement('div');
    btnContainer.className = 'ml-verify-btn';

    const progressFill = document.createElement('div');
    progressFill.className = 'ml-verify-progress';

    const btnText = document.createElement('div');
    btnText.className = 'ml-verify-text';
    btnText.innerText = 'Press and Hold';

    btnContainer.appendChild(progressFill);
    btnContainer.appendChild(btnText);
    box.appendChild(btnContainer);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    setTimeout(() => overlay.classList.add('show'), 10);

    let holdTimer;
    let progress = 0;

    const startHolding = (e) => {
        e.preventDefault();
        btnText.innerText = "Holding...";
        btnText.classList.add('holding');

        holdTimer = setInterval(() => {
            if (progress >= 100) {
                clearInterval(holdTimer);
                success();
            } else {
                progress += 2;
                progressFill.style.width = `${progress}%`;
            }
        }, 20);
    };

    const stopHolding = () => {
        if (progress >= 100) return;
        clearInterval(holdTimer);
        progress = 0;
        progressFill.style.width = "0%";
        btnText.innerText = "Press and Hold";
        btnText.classList.remove('holding');
    };

    const success = () => {
        btnText.innerText = "Verified!";
        progressFill.classList.add('success');

        // Notify backend of fallback success
        chrome.runtime.sendMessage({ type: "FALLBACK_SUCCESS", payload: { session_id: SESSION_ID } }, (response) => {
            if (chrome.runtime.lastError || !response.success) {
                console.error("Fallback verification failed:", chrome.runtime.lastError || response.error);
            } else {
                const data = response.data;
                console.log("✅ Fallback verified by backend. New Token:", data.token);
                
                // Update storage locally to show verified status
                const domain = window.location.hostname;
                chrome.storage.local.set({ 
                    [domain]: { 
                        score: 1.0, 
                        decision: "ALLOW", 
                        timestamp: Date.now() 
                    } 
                });

                setTimeout(() => {
                    overlay.classList.remove('show');
                    setTimeout(() => overlay.remove(), 300);
                }, 800);
            }
        });
    };

    btnContainer.addEventListener('mousedown', startHolding);
    btnContainer.addEventListener('touchstart', startHolding);
    window.addEventListener('mouseup', stopHolding);
    window.addEventListener('touchend', stopHolding);
}
