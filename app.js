// --- Application State ---
const state = {
    voiceEnabled: false,
    language: 'en-US',
    currentNavRoutes: [],
    currentStepIndex: 0,
    currentMedicineText: '',
    qrScannerInstance: null
};

// --- Mock Databases ---
const mockMedicines = {
    "DEFAULT": {
        name: "Paracetamol",
        dosage: "500 mg",
        schedule: "Every 6 hours as needed",
        warnings: "Do not exceed 4000 mg in 24 hours. Avoid alcohol."
    },
    "INSULIN_101": {
        name: "Insulin Glargine",
        dosage: "15 Units",
        schedule: "Once daily before bedtime",
        warnings: "Check blood sugar before administration. Store in refrigerator."
    }
};

const mockRoutes = {
    "pharmacy": [
        "Head straight towards the Main Lobby.",
        "Pass the seating area on your left.",
        "Take the elevator to the 1st Floor.",
        "Exit right. Pharmacy is the blue double door."
    ],
    "laboratory": [
        "Go straight down the main corridor.",
        "Follow the green line on the floor.",
        "Pass the cafeteria on your right.",
        "The Laboratory entrance is straight ahead."
    ],
    "reception": [
        "Turn around.",
        "Walk straight for 30 meters.",
        "The Reception desk is in front of the main exit."
    ]
};

// --- Hardware Web APIs wrappers ---
function triggerVibrate(pattern) {
    if ("vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
}

function speakText(text, forceBypass = false) {
    if ((state.voiceEnabled || forceBypass) && "speechSynthesis" in window) {
        window.speechSynthesis.cancel(); // Clears queue to interrupt any ongoing speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = state.language;
        // Adjust rate and pitch for better accessibility
        utterance.rate = 0.9;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    }
}

function stopSpeaking() {
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
}

// --- DOM Operations & Flow Logic ---
document.addEventListener("DOMContentLoaded", () => {
    
    // Audio Toggle in Header
    const btnNavAudio = document.getElementById('nav-btn-audio');
    const iconNavAudio = document.getElementById('nav-icon-audio');
    const btnToggleVoice = document.getElementById('btn-toggle-voice');

    function syncAudioState() {
        if (state.voiceEnabled) {
            iconNavAudio.classList.remove('fa-volume-xmark');
            iconNavAudio.classList.add('fa-volume-high');
            btnNavAudio.setAttribute('aria-pressed', 'true');
            
            if(btnToggleVoice) {
                btnToggleVoice.innerHTML = '<i class="fa-solid fa-volume-high text-3xl mb-2 text-medical-blue"></i><span class="text-sm">Voice On</span>';
                btnToggleVoice.classList.add('bg-blue-50', 'border-medical-blue');
            }
        } else {
            iconNavAudio.classList.remove('fa-volume-high');
            iconNavAudio.classList.add('fa-volume-xmark');
            btnNavAudio.setAttribute('aria-pressed', 'false');
            
            if(btnToggleVoice) {
                btnToggleVoice.innerHTML = '<i class="fa-solid fa-volume-xmark text-3xl mb-2 text-slate-400"></i><span class="text-sm">Voice Off</span>';
                btnToggleVoice.classList.remove('bg-blue-50', 'border-medical-blue');
            }
            stopSpeaking();
        }
    }

    btnNavAudio.addEventListener('click', () => {
        state.voiceEnabled = !state.voiceEnabled;
        syncAudioState();
        if(state.voiceEnabled) speakText("Voice guidance enabled.", true);
    });

    if(btnToggleVoice) {
        btnToggleVoice.addEventListener('click', () => {
            state.voiceEnabled = !state.voiceEnabled;
            syncAudioState();
            if(state.voiceEnabled) speakText("Voice output activated.", true);
        });
    }

    // Settings
    document.getElementById('btn-test-vibrate').addEventListener('click', () => {
        triggerVibrate([300, 100, 300]);
        speakText("Haptics tested.");
    });
    
    document.getElementById('lang-select').addEventListener('change', (e) => {
        state.language = e.target.value;
        speakText("Language initialized.", true);
    });

    // Login routing
    document.getElementById('btn-login').addEventListener('click', () => {
        const id = document.getElementById('patient-id').value.trim();
        // Allow bypass without ID for demo smoothness, or require it
        switchView('v-dashboard');
        triggerVibrate(100);
        speakText("Login successful. Here is your dashboard.");
    });

    // Sub-Dashboard Navigations
    document.getElementById('btn-nav-medicines').addEventListener('click', () => {
        triggerVibrate([100]);
        speakText("Medicines module is under construction.");
        alert("Navigating to My Medicines List.");
    });
    
    document.getElementById('btn-nav-navigation').addEventListener('click', () => {
        triggerVibrate([100]);
        switchView('v-navigation');
        document.getElementById('nav-setup').classList.remove('hidden');
        document.getElementById('nav-active').classList.add('hidden');
        speakText("Hospital Navigation. Please select your destination.");
    });

    document.getElementById('btn-nav-qr').addEventListener('click', () => {
        triggerVibrate([100]);
        openScannerView();
    });

    document.getElementById('btn-nav-emergency').addEventListener('click', () => {
        triggerVibrate([1000, 500, 1000, 500, 1000]);
        speakText("Emergency protocol activated. Assistance is being dispatched to your location.", true);
        alert('EMERGENCY: Security and Medical Teams Alerted!');
    });

    // Back button behavior loops
    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.addEventListener('click', () => {
            triggerVibrate(100);
            stopSpeaking();
            
            if (state.qrScannerInstance) {
                try {
                    state.qrScannerInstance.stop().then(() => {
                        switchView('v-dashboard');
                    }).catch(() => {
                        switchView('v-dashboard');
                    });
                } catch (e) {
                    switchView('v-dashboard');
                }
            } else {
                switchView('v-dashboard');
            }
            speakText("Dashboard.");
        });
    });

    // Navigation Logic
    document.getElementById('btn-start-nav').addEventListener('click', () => {
        const destInput = document.getElementById('nav-destination');
        const dest = destInput.value;
        const destText = destInput.options[destInput.selectedIndex].text;
        
        if (!dest) {
            triggerVibrate([200, 100, 200]);
            speakText("Please select a destination from the list.");
            return;
        }
        
        state.currentNavRoutes = mockRoutes[dest];
        state.currentStepIndex = 0;
        
        document.getElementById('nav-setup').classList.add('hidden');
        document.getElementById('nav-active').classList.remove('hidden');
        document.getElementById('nav-dest-display').textContent = destText.replace(/[^a-zA-Z\s]/g, ''); // Remove emojis for text display
        
        triggerVibrate([300]);
        showNextStep();
    });

    document.getElementById('nav-next-btn').addEventListener('click', showNextStep);
    
    document.getElementById('nav-repeat-btn').addEventListener('click', () => {
        triggerVibrate(150);
        speakText(document.getElementById('nav-step-text').textContent, true);
    });

    // Scanner Restart Logic
    document.getElementById('btn-scan-again').addEventListener('click', () => {
        triggerVibrate(100);
        openScannerView();
    });
    
    // Manual Meds Audio Logic
    document.getElementById('btn-play-audio').addEventListener('click', () => {
        if (state.currentMedicineText) {
            triggerVibrate(150);
            speakText(state.currentMedicineText, true);
        }
    });
});

// Helper Function: Routing UI
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(v => {
        v.classList.add('hidden');
        v.classList.remove('active');
    });
    
    const target = document.getElementById(viewId);
    target.classList.remove('hidden');
    // Allow display cycle to hit before adding active class for CSS transition
    setTimeout(() => {
        target.classList.add('active');
    }, 10);
    
    // Accessibility focus management
    window.scrollTo(0,0);
}

// Navigation Step Controller
function showNextStep() {
    const stepDisplay = document.getElementById('nav-step-text');
    const nextBtn = document.getElementById('nav-next-btn');
    const progressText = document.getElementById('nav-progress');
    
    if (state.currentStepIndex < state.currentNavRoutes.length) {
        const textToRead = state.currentNavRoutes[state.currentStepIndex];
        stepDisplay.textContent = textToRead;
        progressText.textContent = `Step ${state.currentStepIndex + 1} of ${state.currentNavRoutes.length}`;
        
        triggerVibrate([300, 100, 300]); // Solid dual-vibration for step validation
        speakText(`Step ${state.currentStepIndex + 1}. ${textToRead}`);
        
        state.currentStepIndex++;
        
        if (state.currentStepIndex === state.currentNavRoutes.length) {
            nextBtn.innerHTML = `Finish Navigation <i class="fa-solid fa-flag-checkered"></i>`;
            nextBtn.classList.replace('bg-medical-blue', 'bg-emerald-600');
            nextBtn.classList.replace('hover:bg-blue-800', 'hover:bg-emerald-800');
        }
    } else {
        // Finished
        triggerVibrate([1000, 200, 1000]); // Long celebratory vibration
        speakText("You have arrived at your destination.", true);
        switchView('v-dashboard');
        
        // Reset button state for next time
        nextBtn.innerHTML = `Next Step <i class="fa-solid fa-arrow-right"></i>`;
        nextBtn.classList.replace('bg-emerald-600', 'bg-medical-blue');
        nextBtn.classList.replace('hover:bg-emerald-800', 'hover:bg-blue-800');
    }
}

// QR Scanner Logic
function openScannerView() {
    switchView('v-scanner');
    document.getElementById('scanned-result').classList.add('hidden');
    document.getElementById('scanner-wrapper').classList.remove('hidden');
    
    speakText("Camera scanner opened. Point your device at the Medicine Code.");

    if (!state.qrScannerInstance) {
        state.qrScannerInstance = new Html5Qrcode("reader");
    }
    
    let lastRejectedTime = 0;
    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
    
    // Use the comprehensive start method with camera selection if needed, but defaults to environment
    state.qrScannerInstance.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            // Success handler
            if (isValidMedicineCode(decodedText)) {
                stopScannerAndShowResult(decodedText);
            } else {
                const now = Date.now();
                if (now - lastRejectedTime > 4000) { // Limit vibration to avoid spam on bad codes
                    triggerVibrate(30); 
                    lastRejectedTime = now;
                }
            }
        },
        (error) => {
            // Keep scanning, no verbose error handling needed for frame misses
        }
    ).catch(err => {
        console.error("Camera err:", err);
        alert("Camera access denied or unavailable. Please ensure permissions are granted.");
    });
}

function isValidMedicineCode(code) {
    if (mockMedicines[code]) return true;
    try {
        const parsed = JSON.parse(code);
        if (parsed && typeof parsed === 'object' && parsed.name) return true;
    } catch(e) {}
    return false;
}

function stopScannerAndShowResult(codeText) {
    if (state.qrScannerInstance) {
        try {
            state.qrScannerInstance.stop().then(() => {
                processScannedCode(codeText);
            }).catch(err => {
                console.error("Fail stop", err);
                processScannedCode(codeText); // Show anyway
            });
        } catch (e) {
            processScannedCode(codeText);
        }
    } else {
        processScannedCode(codeText);
    }
}

function processScannedCode(code) {
    document.getElementById('scanner-wrapper').classList.add('hidden');
    
    let med = null;

    // 1. Try to see if the QR Code itself contains the actual JSON medicine data!
    try {
        const parsed = JSON.parse(code);
        if (parsed.name) {
            med = {
                name: parsed.name,
                dosage: parsed.dosage || "Unknown Dosage",
                schedule: parsed.schedule || "Check package for schedule.",
                warnings: parsed.warnings || "No specific warnings listed."
            };
        }
    } catch(e) { }

    // 2. Fall back to internal mock DB
    if (!med) {
        med = mockMedicines[code] || mockMedicines["DEFAULT"];
    }
    
    document.getElementById('med-name').textContent = med.name;
    document.getElementById('med-dosage').textContent = med.dosage;
    document.getElementById('med-schedule').textContent = med.schedule;
    document.getElementById('med-warnings').textContent = med.warnings;
    
    document.getElementById('scanned-result').classList.remove('hidden');
    
    triggerVibrate([500, 100, 500]); // Strong haptic on success
    
    const readText = `Medicine Scanned. Name: ${med.name}. Dosage: ${med.dosage}.`;
    state.currentMedicineText = readText; // Cache string
    speakText(readText, true);
}
