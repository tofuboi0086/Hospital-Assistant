// --- Application State ---
const state = {
    voiceEnabled: false,
    language: 'en-US',
    hugeFontEnabled: false,
    highContrastEnabled: false,
    currentNavRoutes: [],
    currentStepIndex: 0,
    currentMedicineText: '',
    qrScannerInstance: null,
    currentUser: null // Will hold the logged-in patient object
};

// --- Mock Databases ---
const mockPatients = {
    "P1001": {
        name: "John Doe",
        diseases: ["Hypertension", "Type 2 Diabetes"],
        prescriptions: ["PARACETAMOL", "METFORMIN"]
    },
    "P1002": {
        name: "Jane Smith",
        diseases: ["Asthma"],
        prescriptions: ["ALBUTEROL"]
    }
};

const mockMedicines = {
    "PARACETAMOL": {
        name: "Paracetamol",
        contents: "Acetaminophen 500mg",
        purpose: "Pain relief and fever reduction",
        dosage: "1 Tablet",
        schedule: "Every 6 hours as needed",
        warnings: "Do not exceed 4000 mg in 24 hours. Avoid alcohol.",
        whoCanConsume: "Adults and children over 12"
    },
    "METFORMIN": {
        name: "Metformin",
        contents: "Metformin Hydrochloride 500mg",
        purpose: "Blood sugar control",
        dosage: "1 Tablet",
        schedule: "Twice daily with meals",
        warnings: "May cause stomach upset. Do not crush.",
        whoCanConsume: "Adults with Type 2 Diabetes"
    },
    "ALBUTEROL": {
        name: "Albuterol Inhaler",
        contents: "Albuterol Sulfate 90mcg",
        purpose: "Asthma relief / Bronchodilator",
        dosage: "2 Puffs",
        schedule: "Every 4-6 hours as needed for shortness of breath",
        warnings: "May cause rapid heart rate or tremors.",
        whoCanConsume: "Asthma patients"
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

    // Advanced Accessibility Toggles
    const bodyEl = document.body;
    
    document.getElementById('btn-toggle-font').addEventListener('click', (e) => {
        state.hugeFontEnabled = !state.hugeFontEnabled;
        const btn = e.currentTarget;
        
        if (state.hugeFontEnabled) {
            bodyEl.classList.add('a11y-huge-font');
            btn.classList.add('bg-blue-50', 'border-medical-blue');
            speakText("Huge font enabled.");
        } else {
            bodyEl.classList.remove('a11y-huge-font');
            btn.classList.remove('bg-blue-50', 'border-medical-blue');
            speakText("Normal font enabled.");
        }
    });

    document.getElementById('btn-toggle-contrast').addEventListener('click', (e) => {
        state.highContrastEnabled = !state.highContrastEnabled;
        const btn = e.currentTarget;
        
        if (state.highContrastEnabled) {
            bodyEl.classList.add('a11y-high-contrast');
            btn.classList.add('bg-blue-50', 'border-medical-blue');
            speakText("High contrast mode enabled.");
        } else {
            bodyEl.classList.remove('a11y-high-contrast');
            btn.classList.remove('bg-blue-50', 'border-medical-blue');
            speakText("Normal contrast enabled.");
        }
    });

    // Settings
    document.getElementById('btn-test-vibrate').addEventListener('click', () => {
        triggerVibrate([300, 100, 300]);
        speakText("Haptics tested.");
    });
    
    document.getElementById('lang-select').addEventListener('change', (e) => {
        state.language = e.target.value;
        speakText("Language initialized.", true);
    });

    // Login routing - Strict Authentication
    document.getElementById('btn-login').addEventListener('click', () => {
        const id = document.getElementById('patient-id').value.trim().toUpperCase();
        
        if (!id) {
            triggerVibrate([200, 100, 200]);
            speakText("Please enter your Patient ID.");
            return;
        }

        if (mockPatients[id]) {
            state.currentUser = mockPatients[id];
            // Update UI with user name
            document.getElementById('dashboard-greeting').textContent = `Welcome, ${state.currentUser.name}`;
            document.getElementById('patient-id').value = ''; // clear input
            
            switchView('v-dashboard');
            triggerVibrate(100);
            speakText(`Login successful. Welcome, ${state.currentUser.name}. Here is your dashboard.`);
        } else {
            triggerVibrate([300, 200, 300]);
            speakText("Patient ID not found in the database. Please try again.");
            alert("Error: Patient ID not recognized. Try P1001 or P1002.");
        }
    });

    // Sub-Dashboard Navigations
    document.getElementById('btn-nav-medicines').addEventListener('click', () => {
        triggerVibrate(100);
        speakText("My Medicines.");
        renderMedicinesList();
        switchView('v-medicines');
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
function renderMedicinesList() {
    const container = document.getElementById('medicines-list-container');
    container.innerHTML = ''; // clear

    if (!state.currentUser || !state.currentUser.prescriptions || state.currentUser.prescriptions.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-slate-500 font-bold text-xl">You have no active prescriptions.</div>`;
        return;
    }

    state.currentUser.prescriptions.forEach(medKey => {
        const med = mockMedicines[medKey];
        if (!med) return;

        const card = document.createElement('div');
        card.className = "bg-white border-4 border-medical-blue rounded-xl p-5 shadow-md flex flex-col gap-2 relative overflow-hidden";
        
        card.innerHTML = `
            <div class="flex items-center gap-3 border-b-2 border-slate-100 pb-3 mb-2">
                <i class="fa-solid fa-prescription-bottle-medical text-3xl text-medical-blue"></i>
                <h3 class="text-xl font-black text-slate-800">${med.name}</h3>
            </div>
            <div>
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wider block">Dosage</span>
                <span class="text-lg font-bold text-slate-900">${med.dosage}</span>
            </div>
            <div>
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wider block">Schedule</span>
                <span class="text-md font-semibold text-medical-blue">${med.schedule}</span>
            </div>
            <button class="mt-2 text-left bg-slate-100 hover:bg-slate-200 p-3 rounded-lg font-bold text-slate-700 transition" onclick="triggerVibrate(50); speakText('${med.name}. Dosage: ${med.dosage}. Schedule: ${med.schedule}.')">
                <i class="fa-solid fa-volume-high text-medical-blue mr-2"></i> Read Info
            </button>
        `;
        container.appendChild(card);
    });
}
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
    // The scanner STRICTLY looks for codes starting with 'rnsitmed_'
    if (typeof code === 'string' && code.startsWith('rnsitmed_')) {
        return true;
    }
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
    
    // Extract medicine ID from 'rnsitmed_medicine_name'
    // E.g. 'rnsitmed_paracetamol' -> 'PARACETAMOL'
    const extractedKey = code.substring(9).toUpperCase(); 
    
    const med = mockMedicines[extractedKey];

    if (!med) {
        document.getElementById('med-name').textContent = "Unknown Medicine (" + extractedKey + ")";
        document.getElementById('med-contents').textContent = "Not found in database.";
        document.getElementById('med-dosage').textContent = "N/A";
        document.getElementById('med-schedule').textContent = "N/A";
        document.getElementById('med-warnings').textContent = "N/A";
        
        document.getElementById('prescription-alert').classList.remove('bg-emerald-100', 'border-emerald-500', 'text-emerald-800');
        document.getElementById('prescription-alert').classList.add('bg-red-100', 'border-red-500', 'text-red-800');
        document.getElementById('prescription-alert-icon').className = 'fa-solid fa-triangle-exclamation mr-2 text-2xl';
        document.getElementById('prescription-alert-text').textContent = "MEDICINE NOT RECOGNIZED IN HOSPITAL DATABASE!";
        
        document.getElementById('scanned-result').classList.remove('hidden');
        triggerVibrate([800, 200, 800]); 
        const errorText = `Medicine not found in database.`;
        state.currentMedicineText = errorText;
        speakText(errorText, true);
        return;
    }
    
    // UI Update for found medicine
    document.getElementById('med-name').textContent = med.name;
    document.getElementById('med-contents').textContent = med.contents;
    document.getElementById('med-dosage').textContent = med.dosage;
    document.getElementById('med-schedule').textContent = med.schedule;
    document.getElementById('med-warnings').textContent = med.warnings;
    
    // Cross-reference Authentication Database
    const isPrescribed = state.currentUser.prescriptions.includes(extractedKey);
    const alertBox = document.getElementById('prescription-alert');
    const alertIcon = document.getElementById('prescription-alert-icon');
    const alertText = document.getElementById('prescription-alert-text');
    
    let speechPrefix = "";

    if (isPrescribed) {
        // Safe: Green UI
        alertBox.classList.remove('bg-red-100', 'border-red-500', 'text-red-800');
        alertBox.classList.add('bg-emerald-100', 'border-emerald-500', 'text-emerald-800');
        alertIcon.className = 'fa-solid fa-circle-check mr-2 text-2xl';
        alertText.textContent = "SAFE: Prescribed to you.";
        triggerVibrate([500, 100, 500]); // Happy vibrate
        speechPrefix = "Safe. This is prescribed to you.";
    } else {
        // Danger: Red UI
        alertBox.classList.remove('bg-emerald-100', 'border-emerald-500', 'text-emerald-800');
        alertBox.classList.add('bg-red-100', 'border-red-500', 'text-red-800');
        alertIcon.className = 'fa-solid fa-triangle-exclamation mr-2 text-2xl animate-pulse';
        alertText.textContent = "DANGER: NOT PRESCRIBED FOR YOU!";
        triggerVibrate([1000, 200, 1000, 200, 1000]); // Multiple heavy vibrate pattern
        speechPrefix = "Warning! Danger! This medicine is NOT prescribed for your profile.";
    }
    
    document.getElementById('scanned-result').classList.remove('hidden');
    
    const readText = `${speechPrefix} Medicine Scanned: ${med.name}. Contains: ${med.contents}. Purpose: ${med.purpose}. Dosage: ${med.dosage}. Schedule: ${med.schedule}. Warnings: ${med.warnings}`;
    state.currentMedicineText = readText; // Cache string
    speakText(readText, true);
}
