// Authentication variables
let currentUser = null;
const ALLOWED_EMAILS = ['rohit@qurist.in', 'rachna@qurist.in'];

// Handle Google Sign-In response
function handleCredentialResponse(response) {
    // Decode the credential response
    const credential = parseJwt(response.credential);
    console.log("Decoded credential:", credential);
    
    // Convert to lowercase for case-insensitive comparison
    const email = credential.email.toLowerCase();
    
    // Check if email is in the allowed list (case-insensitive)
    const isAllowed = ALLOWED_EMAILS.some(
        allowed => allowed.toLowerCase() === email || 
        email.includes(allowed.split('@')[0].toLowerCase())
    );
    
    if (isAllowed) {
        // Valid doctor email
        console.log("Valid doctor login:", email);
        currentUser = {
            email: email,
            name: credential.name,
            picture: credential.picture
        };
        
        // Set the doctor select based on the email (case-insensitive)
        if (email.includes('rohit')) {
            document.getElementById('doctorSelect').value = 'dr_rohit';
            document.getElementById('doctorSelect').disabled = true;
        } else if (email.includes('rachna')) {
            document.getElementById('doctorSelect').value = 'dr_rachna';
            document.getElementById('doctorSelect').disabled = true;
        }
        
        // Display login success and show app
        document.getElementById('loginMessage').textContent = 'Login successful!';
        document.getElementById('loginMessage').className = 'login-message success';
        
        // Set user email in the header
        document.getElementById('userEmail').textContent = email;
        
        // Hide login overlay and show app after a short delay
        setTimeout(() => {
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
        }, 1000);
    } else {
        // Invalid doctor email
        console.log("Invalid doctor login attempt:", email);
        document.getElementById('loginMessage').textContent = 'Access denied. Only authorized doctors can use this application.';
        document.getElementById('loginMessage').className = 'login-message error';
        currentUser = null;
        
        // Retry Google Sign In
        google.accounts.id.prompt();
    }
}

// Function to parse JWT token
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

// Logout function
function logout() {
    // Clear user data
    currentUser = null;
    
    // Reset the doctor select
    document.getElementById('doctorSelect').value = '';
    document.getElementById('doctorSelect').disabled = false;
    
    // Show login overlay and hide app
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    
    // Reset login message
    document.getElementById('loginMessage').textContent = '';
    document.getElementById('loginMessage').className = 'login-message';
    
    // Clear form if needed
    resetForm();
    
    // Sign out from Google
    google.accounts.id.disableAutoSelect();
}

// Function to initialize Google Identity Services API
function initializeGoogleAuth() {
    // IMPORTANT: Replace with your actual Google OAuth client ID
    // Get it from Google Cloud Console: https://console.cloud.google.com/
    // 1. Create a new project (or use existing)
    // 2. Configure the OAuth consent screen (External type is fine for testing)
    // 3. Add rohit@qurist.in and rachna@qurist.in as test users
    // 4. Create OAuth client ID (Web application type)
    // 5. Add your app's URL to the Authorized JavaScript origins
    const CLIENT_ID = "135379719308-bqao7783qu7evcoh5skku7bopikn8dk6.apps.googleusercontent.com";
    
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse
    });
    
    // Display the Sign In button
    google.accounts.id.renderButton(
        document.querySelector(".g_id_signin"),
        { 
            theme: "outline", 
            size: "large",
            type: "standard",
            shape: "rectangular",
            text: "signin_with",
            logo_alignment: "center"
        }
    );
    
    // Prompt One Tap UI
    google.accounts.id.prompt();
}

// Function to update dosage options - move this OUTSIDE the DOMContentLoaded listener
function updateDosageOptions(medicationSelect) {
    const dosageSelect = medicationSelect.parentElement.parentElement.querySelector('.medication-dosage');
    const selectedMed = medicationSelect.value;
    
    // Clear existing options
    dosageSelect.innerHTML = '<option value="">Select Dosage</option>';
    
    // Add appropriate dosage options based on medication type
    if (selectedMed.includes('CBD') || selectedMed.includes('THC')) {
        const oilDosages = [
            { value: '0.25 ml', display: '0.25 ml (1/4 ml)' },
            { value: '0.5 ml', display: '0.5 ml (1/2 ml)' },
            { value: '0.75 ml', display: '0.75 ml (3/4 ml)' },
            { value: '1 ml', display: '1 ml' }
        ];
        oilDosages.forEach(dosage => {
            const option = new Option(dosage.display, dosage.value);
            dosageSelect.add(option);
        });
    } else if (selectedMed.includes('Pills')) {
        const option = new Option('1 capsule', '1 capsule');
        dosageSelect.add(option);
    } else if (selectedMed.includes('Gummies')) {
        const gummyDosages = [
            { value: '1/4 gummy', display: '1/4 gummy' },
            { value: '1/2 gummy', display: '1/2 gummy' },
            { value: '1 gummy', display: '1 gummy' }
        ];
        gummyDosages.forEach(dosage => {
            const option = new Option(dosage.display, dosage.value);
            dosageSelect.add(option);
        });
    }
    
    // Add custom option
    const customOption = new Option('Custom dosage...', 'custom');
    dosageSelect.add(customOption);
    
    // Make sure the custom dosage textarea exists
    let customDosageTextarea = medicationSelect.parentElement.parentElement.querySelector('.custom-dosage');
    if (!customDosageTextarea) {
        customDosageTextarea = document.createElement('textarea');
        customDosageTextarea.className = 'custom-dosage';
        customDosageTextarea.placeholder = 'Enter custom dosage here...';
        customDosageTextarea.style.display = 'none';
        medicationSelect.parentElement.parentElement.querySelector('.form-group:nth-child(2)').appendChild(customDosageTextarea);
        
        // Add auto-resize listener
        customDosageTextarea.addEventListener('input', function() {
            autoResizeTextArea(this);
        });
    }
    
    // Add change listener to the dosage select
    dosageSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
            customDosageTextarea.style.display = 'block';
            customDosageTextarea.focus();
        } else {
            customDosageTextarea.style.display = 'none';
        }
    });
    
    updateInstructionOptions(medicationSelect);
}

// Function to update instruction options - move this OUTSIDE the DOMContentLoaded listener
function updateInstructionOptions(medicationSelect) {
    const instructionsContainer = medicationSelect.parentElement.parentElement.querySelector('.instructions-container');
    const selectedMed = medicationSelect.value;
    
    // Clear existing options
    instructionsContainer.querySelector('.instructions-checklist').innerHTML = '';
    
    // Add appropriate instruction options based on medication type
    const instructions = selectedMed.includes('CBD') || selectedMed.includes('THC') 
        ? [
            'Sublingually -- 30 minutes before bedtime -- After Dinner',
            'Sublingually -- After Breakfast',
            'Sublingually -- After Lunch',
            'Sublingually -- As and When Required (SOS)',
            'External Application -- As and When Required (SOS)'
        ]
        : [
            '30 minutes before bedtime -- After Dinner',
            'After Breakfast',
            'After Lunch',
            'As and When Required (SOS)'
        ];

    const checklistDiv = instructionsContainer.querySelector('.instructions-checklist');
    instructions.forEach(instruction => {
        const checkbox = document.createElement('div');
        checkbox.className = 'checkbox-item';
        checkbox.innerHTML = `
            <input type="checkbox" value="${instruction}">
            <label>${instruction}</label>
        `;
        checklistDiv.appendChild(checkbox);
    });
}

// Add this function outside the DOMContentLoaded listener
function autoResizeTextArea(element) {
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
}

// Add this function at the top level
function addPageContinuationText(doc, pageNum, totalPages) {
    if (pageNum < totalPages) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128); // Gray color
        
        // Add a subtle line
        doc.setDrawColor(200, 200, 200); // Light gray
        doc.line(20, doc.internal.pageSize.height - 25, 190, doc.internal.pageSize.height - 25);
        
        // Add continuation text
        doc.text(
            'Continued on next page...',
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 20,
            { align: 'center' }
        );
        
        // Add page numbers
        doc.text(
            `Page ${pageNum} of ${totalPages}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 15,
            { align: 'center' }
        );
    }
}

// Add this function outside the DOMContentLoaded listener
function getDefaultNotes(gender = '', medications = []) {
    const baseNotes = [
        "• Do not combine with alcohol, sleeping pills, or painkillers.",
        "• Store securely away from children.",
        "• Inform your treating physician about using CBD for your medical condition.",
        "• Follow sleep hygiene measures as discussed.",
        "• Maintain age-appropriate healthy nutrition and physical activity as discussed for your medical condition.",
        "• Limit yourself to only one type of CBD product within a 24-hour period."
    ];
    
    // Add pregnancy note only for female patients
    if (gender.toLowerCase() === 'female') {
        baseNotes.splice(3, 0, "• Not recommended during pregnancy or breastfeeding or planning to conceive.");
    }
    
    // Check for oils (CBD, THC)
    const hasOils = medications.some(med => 
        med.toLowerCase().includes('cbd') || 
        med.toLowerCase().includes('thc'));
    
    // Check for pills or gummies
    const hasPillsOrGummies = medications.some(med => 
        med.toLowerCase().includes('pills') || 
        med.toLowerCase().includes('gummies'));
    
    // Add conditional rest instructions
    if (hasOils) {
        baseNotes.push("• Rest for 6 hours after consuming CBD oils.");
        baseNotes.push("• If relief is insufficient, dosage may be gradually increased by 0.25ml increments up to a maximum of 1ml per day.");
    }
    
    if (hasPillsOrGummies) {
        baseNotes.push("• Rest and hydrate well the day after consuming CBD pills or gummies.");
    }
    
    return baseNotes.join('\n');
}

// Add this function outside the DOMContentLoaded listener
function resetForm() {
    // Reset doctor selection - but only if no user is logged in
    if (!currentUser) {
        document.getElementById('doctorSelect').value = '';
        document.getElementById('doctorSelect').disabled = false;
    } else {
        // If user is logged in, keep their doctor selection
        const email = currentUser.email.toLowerCase();
        if (email.includes('rohit')) {
            document.getElementById('doctorSelect').value = 'dr_rohit';
        } else if (email.includes('rachna')) {
            document.getElementById('doctorSelect').value = 'dr_rachna';
        }
        document.getElementById('doctorSelect').disabled = true;
    }
    
    // Reset patient information
    document.getElementById('orderId').value = '';
    document.getElementById('patientName').value = '';
    document.getElementById('patientAge').value = '';
    document.getElementById('patientGender').value = '';
    document.getElementById('patientHeight').value = '';
    document.getElementById('heightUnit').value = 'ft';
    document.getElementById('heightConverted').textContent = 'Enter in format: feet.inches (e.g., 5.11 for 5feet 11inches)';
    document.getElementById('patientWeight').value = '';
    
    // Reset medical information
    document.getElementById('complaints').value = '';
    // Uncheck all complaints checkboxes
    document.querySelectorAll('.complaints-checklist input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.getElementById('comorbidities').value = '';
    document.getElementById('ongoingMedications').value = '';
    document.getElementById('previousCannabis').value = '';
    document.getElementById('diagnosis').value = '';
    
    // Reset follow-up
    document.getElementById('followUpType').value = '';
    document.getElementById('customFollowUpDate').value = '';
    document.getElementById('customFollowUpDate').style.display = 'none';
    
    // Reset date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Reset notes to default (without gender since it's been reset)
    document.getElementById('notes').value = getDefaultNotes();
    autoResizeTextArea(document.getElementById('notes'));
    
    // Remove all medication entries except the first one
    const medicationsContainer = document.getElementById('medicationsContainer');
    const medicationEntries = medicationsContainer.querySelectorAll('.medication-entry');
    
    // Keep the first entry but reset it
    if (medicationEntries.length > 0) {
        const firstEntry = medicationEntries[0];
        firstEntry.querySelector('.medication-name').value = '';
        firstEntry.querySelector('.medication-dosage').innerHTML = '<option value="">Select Dosage</option>';
        firstEntry.querySelector('.instructions-checklist').innerHTML = '';
        firstEntry.querySelector('.instructions-text').value = '';
        
        // Reset custom dosage if it exists
        const customDosage = firstEntry.querySelector('.custom-dosage');
        if (customDosage) {
            customDosage.value = '';
            customDosage.style.display = 'none';
        }
        
        // Remove all other entries
        for (let i = 1; i < medicationEntries.length; i++) {
            medicationEntries[i].remove();
        }
    }
}

// Add function to update notes based on selected medications
function updateNotesBasedOnMedications() {
    const gender = document.getElementById('patientGender').value;
    const medicationSelects = document.querySelectorAll('.medication-name');
    const selectedMeds = Array.from(medicationSelects)
        .map(select => select.value)
        .filter(value => value); // Remove empty values
    
    // Only update if notes appear to be in the default state
    const currentNotes = document.getElementById('notes').value;
    const notesTextarea = document.getElementById('notes');
    
    // Check if it's likely the default notes (contains our common starting points)
    if (currentNotes.includes("• Do not combine with alcohol") && 
        currentNotes.includes("• Store securely away from children")) {
        notesTextarea.value = getDefaultNotes(gender, selectedMeds);
        autoResizeTextArea(notesTextarea);
    }
}

// Add loading overlay utility functions
function showLoadingOverlay(message = 'Processing...') {
    const overlay = document.getElementById('loadingOverlay');
    const messageEl = document.getElementById('loadingMessage');
    
    if (messageEl) {
        messageEl.textContent = message;
    }
    
    if (overlay) {
        overlay.classList.add('show');
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    
    if (overlay) {
        overlay.classList.remove('show');
    }
}

function updateLoadingMessage(message) {
    const messageEl = document.getElementById('loadingMessage');
    
    if (messageEl) {
        messageEl.textContent = message;
    }
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Google authentication
    window.onload = function() {
        initializeGoogleAuth();
    };
    
    // Initialize height converter
    setupHeightConverter();
    
    // Add event listener for logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        logout();
    });
    
    // Check authentication before allowing certain actions
    const checkAuth = function(event, action) {
        if (!currentUser) {
            event.preventDefault();
            alert('You must be logged in to perform this action.');
            return false;
        }
        return true;
    };
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Add event listener for follow-up type
    document.getElementById('followUpType').addEventListener('change', function() {
        const customDateField = document.getElementById('customFollowUpDate');
        if (this.value === 'custom') {
            customDateField.style.display = 'block';
            customDateField.focus();
        } else {
            customDateField.style.display = 'none';
        }
    });
    
    // Initialize complaints checklist
    const complaintsOptions = [
        'Anxiety',
        'Insomnia',
        'Pain',
        'Fatigue',
        'Muscle Soreness',
        'Overthinking',
        'Menstrual Pain',
        'Migraine'
    ];
    
    const complaintsChecklistDiv = document.querySelector('.complaints-checklist');
    complaintsOptions.forEach(complaint => {
        const checkbox = document.createElement('div');
        checkbox.className = 'checkbox-item';
        checkbox.innerHTML = `
            <input type="checkbox" value="${complaint}">
            <label>${complaint}</label>
        `;
        complaintsChecklistDiv.appendChild(checkbox);
    });

    // Add event listener for complaints checkboxes
    complaintsChecklistDiv.addEventListener('change', function(e) {
        if (e.target.type === 'checkbox') {
            const textArea = document.getElementById('complaints');
            const selectedComplaints = Array.from(this.querySelectorAll('input:checked'))
                .map(cb => cb.value)
                .join('\n');
            textArea.value = selectedComplaints;
            autoResizeTextArea(textArea);
        }
    });
    
    // Set default notes (initially without gender or medications)
    document.getElementById('notes').value = getDefaultNotes();
    autoResizeTextArea(document.getElementById('notes'));
    
    // Add a change listener to update notes when gender is changed
    document.getElementById('patientGender').addEventListener('change', function() {
        updateNotesBasedOnMedications();
    });
    
    // Initialize medication counter
    let medicationCounter = 1;
    
    // Add event listener to the "Add Another Medication" button
    document.getElementById('addMedicationBtn').addEventListener('click', function() {
        medicationCounter++;
        
        // Create a new medication entry
        const medicationEntry = document.createElement('div');
        medicationEntry.className = 'medication-entry';
        medicationEntry.innerHTML = `
            <div class="form-group">
                <label for="medication${medicationCounter}">Medication:</label>
                <select id="medication${medicationCounter}" class="medication-name" required onchange="updateDosageOptions(this)">
                    <option value="">Select Medication</option>
                    <option value="CBD mild">CBD mild</option>
                    <option value="CBD medium">CBD medium</option>
                    <option value="CBD strong">CBD strong</option>
                    <option value="CBD + THC mild">CBD + THC mild</option>
                    <option value="CBD + THC medium">CBD + THC medium</option>
                    <option value="CBD + THC strong">CBD + THC strong</option>
                    <option value="Painaway Pills">Painaway Pills</option>
                    <option value="Periodaid Pills">Periodaid Pills</option>
                    <option value="Sleepeasy Gummies">Sleepeasy Gummies</option>
                </select>
            </div>
            <div class="form-group">
                <label for="dosage${medicationCounter}">Dosage:</label>
                <select id="dosage${medicationCounter}" class="medication-dosage" required>
                    <option value="">Select Dosage</option>
                </select>
            </div>
            <div class="form-group instructions-container">
                <label>Instructions:</label>
                <div class="instructions-checklist"></div>
                <textarea class="instructions-text" placeholder="Selected instructions will appear here. You can edit them as needed."></textarea>
            </div>
            <button type="button" class="remove-medication-btn">Remove</button>
        `;
        
        // Add the new medication entry to the container
        document.getElementById('medicationsContainer').appendChild(medicationEntry);
        
        // Add event listener to the remove button
        medicationEntry.querySelector('.remove-medication-btn').addEventListener('click', function() {
            medicationEntry.remove();
        });

        // Add event listener for checkboxes
        medicationEntry.querySelector('.instructions-checklist').addEventListener('change', function(e) {
            if (e.target.type === 'checkbox') {
                const textArea = this.parentElement.querySelector('.instructions-text');
                const selectedInstructions = Array.from(this.querySelectorAll('input:checked'))
                    .map(cb => cb.value)
                    .join('\n');
                textArea.value = selectedInstructions;
                autoResizeTextArea(textArea);
            }
        });

        // After creating new medication entry, add listeners to its textareas
        const newTextareas = medicationEntry.querySelectorAll('textarea');
        newTextareas.forEach(textarea => {
            textarea.addEventListener('input', function() {
                autoResizeTextArea(this);
            });
        });

        // After adding a new medication, we need to add the change listener to its select
        medicationEntry.querySelector('.medication-name').addEventListener('change', function() {
            updateNotesBasedOnMedications();
        });
    });
    
    // Add event listener to the "Generate Prescription" button
    document.getElementById('generatePdfBtn').addEventListener('click', function(event) {
        // Check if user is authenticated
        if (!currentUser) {
            alert('You must be logged in as an authorized doctor to generate prescriptions.');
            return;
        }
        
        const doctorSelect = document.getElementById('doctorSelect').value;
        if (!doctorSelect) {
            alert('Please select a doctor to generate the prescription. This is required for the signature and seal.');
        } else {
            generatePrescriptionPDF();
        }
    });
    
    // Add event listener for Save to Google Sheets button
    document.getElementById('saveToSheetsBtn').addEventListener('click', async function(event) {
        // Check if user is authenticated
        if (!currentUser) {
            alert('You must be logged in as an authorized doctor to save prescriptions to Google Sheets.');
            return;
        }
        
        const button = this;
        const originalText = button.textContent;
        
        try {
            console.log('Save to Sheets button clicked');
            
            // Show loading overlay instead of just changing button text
            showLoadingOverlay('Preparing data...');
            
            // Disable the button
            button.disabled = true;

            // Get all form data
            const prescriptionData = {
                date: document.getElementById('date').value,
                doctorName: document.getElementById('doctorSelect').value === 'dr_rohit' 
                    ? 'Dr. Rohit Yenukoti' 
                    : 'Dr. Rachna Chandra',
                orderId: document.getElementById('orderId').value,
                patientName: document.getElementById('patientName').value,
                patientAge: document.getElementById('patientAge').value,
                patientGender: document.getElementById('patientGender').value,
                patientHeight: getHeightInCm(),
                patientWeight: document.getElementById('patientWeight').value,
                complaints: document.getElementById('complaints').value,
                comorbidities: document.getElementById('comorbidities').value || 'None',
                ongoingMedications: document.getElementById('ongoingMedications').value || 'None',
                previousCannabis: document.getElementById('previousCannabis').value,
                diagnosis: document.getElementById('diagnosis').value || 'None',
                medications: [],
                notes: document.getElementById('notes').value,
                followUp: ''
            };

            // Get follow-up information
            const followUpType = document.getElementById('followUpType').value;
            if (followUpType === '30-day') {
                // Calculate date 30 days from prescription date
                const prescriptionDate = new Date(prescriptionData.date);
                const followUpDate = new Date(prescriptionDate);
                followUpDate.setDate(followUpDate.getDate() + 30);
                prescriptionData.followUp = followUpDate.toISOString().split('T')[0];
            } else if (followUpType === 'custom') {
                prescriptionData.followUp = document.getElementById('customFollowUpDate').value || '';
            } else {
                // Default to 30 days if nothing is selected
                const prescriptionDate = new Date(prescriptionData.date);
                const followUpDate = new Date(prescriptionDate);
                followUpDate.setDate(followUpDate.getDate() + 30);
                prescriptionData.followUp = followUpDate.toISOString().split('T')[0];
            }

            // Get medications
            const medicationEntries = document.querySelectorAll('.medication-entry');
            medicationEntries.forEach(entry => {
                const medicationName = entry.querySelector('.medication-name').value;
                const dosageSelect = entry.querySelector('.medication-dosage');
                
                // Get dosage value (check for custom dosage)
                let dosageValue;
                if (dosageSelect.value === 'custom') {
                    const customDosage = entry.querySelector('.custom-dosage');
                    dosageValue = customDosage && customDosage.value ? customDosage.value : 'Custom dosage';
                } else {
                    dosageValue = dosageSelect.value;
                }
                
                const medication = {
                    name: medicationName,
                    dosage: dosageValue,
                    instructions: entry.querySelector('.instructions-text').value
                };
                prescriptionData.medications.push(medication);
            });

            console.log('Collected form data:', prescriptionData);

            // Initialize Google API if not already initialized
            if (typeof window.initGoogleAPI !== 'function') {
                throw new Error('Google API initialization function not found. Make sure sheets.js is loaded properly.');
            }

            // Check if doctor is selected (required for PDF generation)
            const doctorSelect = document.getElementById('doctorSelect').value;
            if (!doctorSelect) {
                hideLoadingOverlay();
                alert('Please select a doctor to generate the prescription. This is required for the signature and seal.');
                button.textContent = originalText;
                button.disabled = false;
                return;
            }

            // Update message to show PDF generation is starting
            updateLoadingMessage('Generating PDF document...');
            
            // Generate the PDF and get the blob
            const pdfBlob = generatePrescriptionPDF(true);
            
            if (!pdfBlob) {
                throw new Error('Failed to generate PDF');
            }

            // Generate filename for the PDF
            const patientName = document.getElementById('patientName').value;
            const date = document.getElementById('date').value || new Date().toISOString().split('T')[0];
            const fileName = `${patientName}_${formatDate(date)}.pdf`;

            // Update message for Google authentication
            updateLoadingMessage('Authenticating with Google services...');
            
            // Ensure we're authenticated with Google before uploading
            if (!window.accessToken) {
                await window.getAccessToken();
            }

            // Upload the PDF to Google Drive
            updateLoadingMessage('Uploading PDF to Google Drive...');
            const pdfUrl = await uploadPdfToDrive(pdfBlob, fileName, doctorSelect);
            
            // Save data to Google Sheets with the PDF URL
            updateLoadingMessage('Saving prescription data to Google Sheets...');
            await savePrescriptionToSheet(prescriptionData, pdfUrl);
            
            // Final confirmation message
            updateLoadingMessage('Finalizing...');
            setTimeout(() => {
                // Hide the loading overlay after a short delay to ensure the user sees the success message
                hideLoadingOverlay();
                alert('Prescription data and PDF saved successfully!');
            }, 500);
        } catch (error) {
            console.error('Error in save to sheets handler:', error);
            hideLoadingOverlay();
            alert('Error saving data: ' + error.message);
        } finally {
            // Reset button state
            button.textContent = originalText;
            button.disabled = false;
        }
    });
    
    // Function to generate the prescription PDF
    function generatePrescriptionPDF(returnBlob = false) {
        // Check authentication status
        if (!currentUser) {
            alert('You must be logged in as an authorized doctor to generate prescriptions.');
            return null;
        }
        
        // Add medication name mapping
        const medicationDisplayNames = {
            'CBD mild': 'Qurist Wide Spectrum Mild Potency Oil',
            'CBD medium': 'Qurist Wide Spectrum Medium Potency Oil',
            'CBD strong': 'Qurist Wide Spectrum Strong Potency Oil',
            'CBD + THC mild': 'Qurist Full Spectrum Mild Potency Oil',
            'CBD + THC medium': 'Qurist Full Spectrum Medium Potency Oil',
            'CBD + THC strong': 'Qurist Full Spectrum Strong Potency Oil',
            'Painaway Pills': 'Qurist Painaway Pills',
            'Periodaid Pills': 'Qurist Periodaid Pills',
            'Sleepeasy Gummies': 'Qurist Sleepeasy Gummies'
        };

        // Get form data - automatically use authenticated doctor
        const doctorSelect = document.getElementById('doctorSelect').value;
        
        // Define doctor information based on selection
        const doctorInfo = {
            dr_rohit: {
                name: "Dr. Rohit Yenukoti",
                designation: "MBBS",
                regNo: "134654"
            },
            dr_rachna: {
                name: "Dr. Rachna Chandra",
                designation: "MBBS, MD",
                regNo: "DMC/R/2261"
            }
        };

        const selectedDoctor = doctorInfo[doctorSelect] || {};
        
        // Get other form data
        const orderId = document.getElementById('orderId').value;
        const patientName = document.getElementById('patientName').value;
        const patientAge = document.getElementById('patientAge').value;
        const patientGender = document.getElementById('patientGender').value;
        const patientHeight = getHeightInCm();
        const patientWeight = document.getElementById('patientWeight').value;
        
        const complaints = document.getElementById('complaints').value;
        const comorbidities = document.getElementById('comorbidities').value || 'None';
        const ongoingMedications = document.getElementById('ongoingMedications').value || 'None';
        const previousCannabis = document.getElementById('previousCannabis').value;
        const diagnosis = document.getElementById('diagnosis').value || 'None';
        const notes = document.getElementById('notes').value;
        const date = document.getElementById('date').value || new Date().toISOString().split('T')[0];
        
        // Get follow-up information
        const followUpType = document.getElementById('followUpType').value;
        let followUpText = '';
        if (followUpType === '30-day') {
            // Calculate date 30 days from prescription date
            const prescriptionDate = new Date(date);
            const followUpDate = new Date(prescriptionDate);
            followUpDate.setDate(followUpDate.getDate() + 30);
            followUpText = `Follow up consultation on ${formatDate(followUpDate.toISOString().split('T')[0])}`;
        } else if (followUpType === 'custom') {
            const customDate = document.getElementById('customFollowUpDate').value;
            if (customDate) {
                followUpText = `Follow up consultation on ${formatDate(customDate)}`;
            }
        } else {
            // Default to 30 days if nothing is selected
            const prescriptionDate = new Date(date);
            const followUpDate = new Date(prescriptionDate);
            followUpDate.setDate(followUpDate.getDate() + 30);
            followUpText = `Follow up consultation on ${formatDate(followUpDate.toISOString().split('T')[0])}`;
        }
        
        // Get medications (updated to use display names)
        const medications = [];
        const medicationEntries = document.querySelectorAll('.medication-entry');
        
        medicationEntries.forEach(entry => {
            const selectedName = entry.querySelector('.medication-name').value;
            const displayName = medicationDisplayNames[selectedName] || selectedName;
            const dosageSelect = entry.querySelector('.medication-dosage');
            
            // Get dosage value (check for custom dosage)
            let dosage;
            if (dosageSelect.value === 'custom') {
                const customDosage = entry.querySelector('.custom-dosage');
                dosage = customDosage && customDosage.value ? customDosage.value : 'Custom dosage';
            } else {
                dosage = dosageSelect.value;
            }
            
            const instructions = entry.querySelector('.instructions-text').value;
            
            medications.push({
                name: displayName,
                dosage,
                instructions
            });
        });
        
        // Create PDF using jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            compress: true // Add compression to reduce file size
        });
        
        // Add header image
        const headerImg = document.getElementById('headerImage');
        if (headerImg.complete && headerImg.naturalHeight !== 0) {
            const headerAspectRatio = headerImg.naturalWidth / headerImg.naturalHeight;
            const headerWidth = 40; // Smaller width for logo
            const headerHeight = headerWidth / headerAspectRatio;
            doc.addImage(headerImg, 'PNG', 20, 10, headerWidth, headerHeight);
            const startY = headerHeight + 20;
        }
        
        // Add patient info in a single line with tighter spacing
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        
        // First group: Order ID - moved to right side to give space for logo
        doc.text(`Order ID:`, 140, 25);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0); // Set to black
        doc.text(`${orderId}`, 165, 25);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text(`Date:`, 140, 32);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0); // Set to black
        doc.text(`${formatDate(date)}`, 165, 32);
        
        // Add horizontal line above patient information table
        doc.setDrawColor(2, 113, 128); // Use the same teal color as the headers
        doc.setLineWidth(0.5);
        doc.line(20, 40, 190, 40);
        
        doc.autoTable({
            body: [
                [
                    { content: "Name:", styles: { fontStyle: 'bold', textColor: [2, 113, 128] } }, 
                    patientName, 
                    { content: "Age:", styles: { fontStyle: 'bold', textColor: [2, 113, 128] } }, 
                    patientAge, 
                    { content: "Sex:", styles: { fontStyle: 'bold', textColor: [2, 113, 128] } }, 
                    patientGender
                ],
                [
                    { content: "Height:", styles: { fontStyle: 'bold', textColor: [2, 113, 128] } }, 
                    patientHeight ? `${patientHeight} cm` : "", 
                    { content: "Weight:", styles: { fontStyle: 'bold', textColor: [2, 113, 128] } }, 
                    patientWeight ? `${patientWeight} kg` : "",
                    "", 
                    ""
                ]
            ],
            startY: 42,
            margin: { left: 20, right: 20 },
            theme: 'plain',
            styles: {
                fontSize: 10,
                cellPadding: 2,
                lineWidth: 0 // No border lines
            },
            columnStyles: {
                0: { cellWidth: 30 }, // Label
                1: { cellWidth: 40 }, // Value
                2: { cellWidth: 20 }, // Label
                3: { cellWidth: 25 }, // Value
                4: { cellWidth: 20 }, // Label
                5: { cellWidth: 35 }  // Value
            }
        });
        
        // Update current Y position after the table
        let patientTableY = doc.lastAutoTable.finalY + 5;
        
        // Add horizontal line below patient information table
        doc.setDrawColor(2, 113, 128); // Use the same teal color as the headers
        doc.setLineWidth(0.5);
        doc.line(20, patientTableY - 3, 190, patientTableY - 3);
        
        // Add Rx symbol
        const rxImg = document.getElementById('rxImage');
        if (rxImg.complete && rxImg.naturalHeight !== 0) {
            const rxWidth = 18; // Small size for Rx symbol
            const rxHeight = 20;
            doc.addImage(rxImg, 'PNG', 20, patientTableY - 5, rxWidth, rxHeight);
        }

        // Add doctor information on the right side
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.setFontSize(12);
        doc.text(selectedDoctor.name, 145, patientTableY + 2);
        doc.setFontSize(10);
        doc.text(selectedDoctor.designation, 145, patientTableY + 7);
        
        // Add complaints
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text('Complaints:', 20, patientTableY + 20);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0); // Set to black
        doc.text(complaints, 20, patientTableY + 27, { maxWidth: 170 });
        
        // Create table for comorbidities and ongoing medications
        let currentY = doc.getTextDimensions(complaints, { maxWidth: 170 }).h + patientTableY + 35;
        if (comorbidities || ongoingMedications) {
            const coMedColumns = ["Comorbidities", "Ongoing Medications"];
            const coMedRows = [[comorbidities || "-", ongoingMedications || "-"]];
            
            doc.autoTable({
                head: [coMedColumns],
                body: coMedRows,
                startY: currentY,
                margin: { left: 17, right: 20 }, // Add margin to match Recommendations table
                theme: 'plain',
                styles: {
                    fontSize: 10,
                    cellPadding: 3,
                    lineColor: [240, 240, 240],
                    lineWidth: 0.1
                },
                headStyles: {
                    fillColor: false,
                    textColor: [2, 113, 128],
                    fontStyle: 'bold'
                },
                columnStyles: {
                    0: { cellWidth: 85 },
                    1: { cellWidth: 85 }
                }
            });
            
            currentY = doc.lastAutoTable.finalY + 10;
        }
        
        // Add Previous Cannabis Use section
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text('Previous Medical Cannabis Use:', 20, currentY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0); // Set to black
        doc.text(previousCannabis || '', 140, currentY);
        currentY += 10;
        
        // Add Diagnosis section
        if (diagnosis) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(2, 113, 128);
            doc.text('Diagnosis:', 20, currentY);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0); // Set to black
            doc.text(diagnosis, 20, currentY + 7, { maxWidth: 170 });
            currentY = doc.getTextDimensions(diagnosis, { maxWidth: 170 }).h + currentY + 15;
        }
        
        // Add medications with complete table handling
        doc.setFont('helvetica', 'bold');
        const recommendationsY = currentY;
        
        // Check if there's enough space for the entire medications table
        const estimatedTableHeight = (medications.length + 1) * 15; // Rough estimate: header + rows
        if (recommendationsY + estimatedTableHeight > doc.internal.pageSize.height - 40) {
            doc.addPage();
            currentY = 20;
        }
        
        doc.setTextColor(2, 113, 128);
        doc.text('Recommendations:', 20, currentY);
        
        // Create medication table with automatic page break
        doc.autoTable({
            head: [["Medication", "Dosage", "Instructions"]],
            body: medications.map(med => [med.name, med.dosage, med.instructions]),
            startY: currentY + 5,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 3,
                textColor: [0, 0, 0] // Set table content to black
            },
            headStyles: {
                fillColor: [66, 139, 202],
                textColor: [255, 255, 255] // Keep header text white
            },
            pageBreak: 'avoid',
            margin: { left: 20, right: 20 },
            columnStyles: {
                0: { cellWidth: 70 },
                1: { cellWidth: 30 },
                2: { cellWidth: 70 }
            },
            willDrawPage: function(data) {
                // Add header image on new pages
                const headerImg = document.getElementById('headerImage');
                if (headerImg.complete && headerImg.naturalHeight !== 0) {
                    const headerAspectRatio = headerImg.naturalWidth / headerImg.naturalHeight;
                    const headerWidth = 60; // Smaller width for logo
                    const headerHeight = headerWidth / headerAspectRatio;
                    doc.addImage(headerImg, 'PNG', 10, 10, headerWidth, headerHeight);
                }
                
                // Add continuation text for all pages except the last one
                addPageContinuationText(doc, doc.internal.getNumberOfPages(), doc.internal.getNumberOfPages() + 1);
            }
        });
        
        let finalY = doc.lastAutoTable.finalY + 10;
        
        // Add notes if any
        if (notes) {
            // Calculate height needed for notes and footer
            const splitNotes = doc.splitTextToSize(notes, 120);
            const notesHeight = splitNotes.length * 5 + 15; // Height for notes + header + padding
            const footerHeight = 40; // Approximate height needed for footer
            const totalNeededHeight = notesHeight + footerHeight;
            
            // Check if there's enough space for both notes and footer
            if (finalY + totalNeededHeight > doc.internal.pageSize.height - 20) {
                doc.addPage();
                finalY = 20;
            }
            
            // Add notes on the left side
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(2, 113, 128);
            doc.text('Additional Instructions:', 20, finalY);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0); // Set notes text to black
            doc.text(splitNotes, 20, finalY + 7);
            
            // Update finalY to be after notes
            finalY = finalY + 7 + (splitNotes.length * 5);
            
            // Add signature on the right side at the same level
            const signatureImg = document.getElementById(
                doctorSelect === 'dr_rachna' ? 'rachnaSignature' : 'rohitSignature'
            );
            
            if (signatureImg.complete && signatureImg.naturalHeight !== 0) {
                const signWidth = 15;
                const signHeight = (signWidth * signatureImg.naturalHeight) / signatureImg.naturalWidth;
                doc.addImage(signatureImg, 'PNG', 150, finalY - 15, signWidth, signHeight);
            }
            
            // Add seal to the right of signature
            drawDoctorSeal(doc, 185, finalY - 10, selectedDoctor);
            
            doc.line(140, finalY, 190, finalY);
            doc.text("Doctor's Signature", 165, finalY + 5, { align: 'center' });
        }
        
        // Add new sections for telehealth notice, travel disclaimer, and disclaimer
        // Check if we need a new page based on available space
        const additionalSectionsHeight = 105; // Approximate height needed for all additional sections including follow-up and contact information
        if (finalY + additionalSectionsHeight > doc.internal.pageSize.height - 20) {
            doc.addPage();
            finalY = 20;
        }
        
        // Add follow-up section
        finalY += 15;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text('Follow-up Consultation:', 20, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);

        // Always ensure we have follow-up text by defaulting to 30 days if nothing was selected
        if (!followUpText) {
            const prescriptionDate = new Date(date);
            const followUpDate = new Date(prescriptionDate);
            followUpDate.setDate(followUpDate.getDate() + 30);
            followUpText = `Follow up consultation on ${formatDate(followUpDate.toISOString().split('T')[0])}`;
        }

        doc.text(followUpText.replace('Follow up consultation on ', ''), 20, finalY + 7);
        
        // Add telehealth consultation notice
        finalY += 15;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text('Telehealth Notice:', 20, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        doc.text('This prescription is generated on tele-consultation (no physical contact with patient).', 
            20, finalY + 7);
        
        // Add travel disclaimer
        finalY += 15;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text('Travel Advisory:', 20, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        const travelDisclaimer = 'For domestic travel within India: Please carry this prescription with you when traveling with Qurist products. ' +
            'For international travel: Qurist products contain CBD (cannabidiol) and THC (tetrahydrocannabinol). Please make appropriate ' +
            'enquiries regarding airline and local laws and regulations of the departure and destination countries, ' +
            'including all transit points, before traveling with these products internationally.';
        const splitTravelDisclaimer = doc.splitTextToSize(travelDisclaimer, 170);
        doc.text(splitTravelDisclaimer, 20, finalY + 7);
        
        // Update finalY after travel disclaimer
        finalY += 7 + (splitTravelDisclaimer.length * 5);
        
        // Add Important Patient Agreement and Disclaimer
        finalY += 5;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text('Important Patient Agreement and Disclaimer:', 20, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        doc.text('This prescription is solely for therapeutic purposes and should not be used for medico-legal purposes.', 
            20, finalY + 7);
        
        // Update finalY after disclaimer before adding contact information
        finalY += 15;
        
        // Add Contact Information section
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text('Contact Information:', 20, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        doc.text('For any further queries, please contact: +91 9485848844', 
            20, finalY + 7);
        
        finalY += 15;
        
        // Add footer image at the bottom of the last page
        const footerImg = document.getElementById('footerImage');
        if (footerImg.complete && footerImg.naturalHeight !== 0) {
            const footerAspectRatio = footerImg.naturalWidth / footerImg.naturalHeight;
            const footerWidth = 190;
            const footerHeight = footerWidth / footerAspectRatio;
            
            // Only add the footer image to the very last page
            const totalPages = doc.internal.getNumberOfPages();
            doc.setPage(totalPages);
            
            // Check if the content goes too close to where the footer will be
            const minFooterYPosition = doc.internal.pageSize.height - footerHeight - 10;
            if (finalY > minFooterYPosition - 20) {
                // If content would overlap with footer, add a new page for the footer
                doc.addPage();
                // Position footer 10 units from bottom on this new page
                doc.addImage(footerImg, 'PNG', 10, doc.internal.pageSize.height - footerHeight - 10,
                    footerWidth, footerHeight);
                
                // Add custom footer info below the footer image
                addCustomFooterInfo(doc, doc.internal.pageSize.height - 10);
            } else {
                // Position footer 10 units from bottom with sufficient space
                doc.addImage(footerImg, 'PNG', 10, doc.internal.pageSize.height - footerHeight - 10,
                    footerWidth, footerHeight);
                
                // Add custom footer info below the footer image
                addCustomFooterInfo(doc, doc.internal.pageSize.height - 10);
            }
        } else {
            // If no footer image exists, still add the custom footer info
            addCustomFooterInfo(doc, doc.internal.pageSize.height - 30);
        }
        
        // Before saving the PDF, add the final page count
        doc.setProperties({
            title: `Prescription for ${patientName}`,
            subject: 'Medical Prescription',
            creator: 'Qurist Digital Prescription System'
        });

        // Update all pages with the correct total page count
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addPageContinuationText(doc, i, totalPages);
            
            // Add custom footer to all pages except the last one (which already has it)
            if (i < totalPages) {
                // Remove this line to keep the footer only on the last page
                // addCustomFooterInfo(doc, doc.internal.pageSize.height - 30);
            }
        }

        // Save or return the PDF based on the returnBlob parameter
        if (returnBlob) {
            return doc.output('blob');
        } else {
            // Save the PDF as download
            doc.save(`${patientName}_${formatDate(date)}.pdf`);
            return null;
        }
    }
    
    // Helper function to format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    // Update the initial medication entry's checkbox listener
    document.querySelector('.instructions-checklist').addEventListener('change', function(e) {
        if (e.target.type === 'checkbox') {
            const textArea = this.parentElement.querySelector('.instructions-text');
            const selectedInstructions = Array.from(this.querySelectorAll('input:checked'))
                .map(cb => cb.value)
                .join('\n');
            textArea.value = selectedInstructions;
            autoResizeTextArea(textArea);
        }
    });

    // Auto-resize all textareas on input
    document.querySelectorAll('textarea').forEach(textarea => {
        textarea.addEventListener('input', function() {
            autoResizeTextArea(this);
        });
        // Initial resize
        autoResizeTextArea(textarea);
    });

    // Add event listener for the Clear Form button
    document.getElementById('clearFormBtn').addEventListener('click', function() {
        resetForm();
    });

    // Add delegation for medication changes
    document.getElementById('medicationsContainer').addEventListener('change', function(e) {
        if (e.target.classList.contains('medication-name')) {
            // Update dosage options (existing functionality)
            updateDosageOptions(e.target);
            
            // Also update notes based on medications
            updateNotesBasedOnMedications();
        }
    });
});

// Add this function to draw a realistic-looking seal
function drawDoctorSeal(doc, x, y, doctorInfo) {
    // Create a temporary canvas with higher resolution
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas and set center point
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(200, 200);
    
    // Draw circles with adjusted sizes
    ctx.strokeStyle = '#003366';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 160, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 140, 0, Math.PI * 2);
    ctx.stroke();
    
    // Apply rotation
    ctx.rotate(Math.PI / 12);
    
    // Add text with larger font sizes
    ctx.fillStyle = '#003366';
    ctx.textAlign = 'center';
    
    ctx.font = 'bold 26px Arial';
    ctx.fillText(doctorInfo.name, 0, -40);
    
    // Registration info
    ctx.font = '20px Arial';
    ctx.fillText('Certified Medical Practitioner', 0, 0);
    ctx.fillText(`Reg No: ${doctorInfo.regNo}`, 0, 40);
    ctx.fillText('Hemp Health Pvt Ltd', 0, 80);
    
    // Add the canvas as an image to the PDF with the same final size
    doc.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        x - 20,
        y - 15,
        40,
        40
    );
}

// Add this function at the top level
function addCustomFooterInfo(doc, y) {
    // Set font and color for footer text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255); // Change to white color
    
    // Adjust vertical position - move everything up by adjusting y coordinate
    const adjustedY = y - 25; // Move the footer up by 25 units
    
    // Add company name
    doc.text('Hemp Health Pvt. Ltd.', doc.internal.pageSize.width / 2, adjustedY, { align: 'center' });
    
    // Add CIN number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('CIN No. U2423 | HR2020PTC087774', doc.internal.pageSize.width / 2, adjustedY + 5, { align: 'center' });
    
    // Add social media and website links with images
    const websiteText = 'www.qurist.in';
    const instagramText = '@quristcbd';
    const facebookText = '@quristcbd';
    
    // Calculate positions for the three links to be evenly spaced
    const totalWidth = doc.internal.pageSize.width - 40; // leaving 20 units margin on each side
    const spacing = totalWidth / 3;
    
    // Get the social media icons
    const websiteImg = document.getElementById('websiteImage');
    const instagramImg = document.getElementById('instagramImage');
    const facebookImg = document.getElementById('facebookImage');
    
    // Icon size and positioning
    const iconWidth = 5;
    const iconHeight = 5;
    const iconSpacing = 2;
    
    // Position for website
    if (websiteImg && websiteImg.complete && websiteImg.naturalHeight !== 0) {
        doc.addImage(websiteImg, 'PNG', 20 + spacing / 2 - 15, adjustedY + 9, iconWidth, iconHeight);
        doc.text(websiteText, 20 + spacing / 2 - 15 + iconWidth + iconSpacing, adjustedY + 12.5);
    } else {
        doc.text('🌐 ' + websiteText, 20 + spacing / 2, adjustedY + 12, { align: 'center' });
    }
    
    // Position for Instagram
    if (instagramImg && instagramImg.complete && instagramImg.naturalHeight !== 0) {
        doc.addImage(instagramImg, 'PNG', 20 + spacing + spacing / 2 - 15, adjustedY + 9, iconWidth, iconHeight);
        doc.text(instagramText, 20 + spacing + spacing / 2 - 15 + iconWidth + iconSpacing, adjustedY + 12.5);
    } else {
        doc.text('📷 ' + instagramText, 20 + spacing + spacing / 2, adjustedY + 12, { align: 'center' });
    }
    
    // Position for Facebook
    if (facebookImg && facebookImg.complete && facebookImg.naturalHeight !== 0) {
        doc.addImage(facebookImg, 'PNG', 20 + 2 * spacing + spacing / 2 - 15, adjustedY + 9, iconWidth, iconHeight);
        doc.text(facebookText, 20 + 2 * spacing + spacing / 2 - 15 + iconWidth + iconSpacing, adjustedY + 12.5);
    } else {
        doc.text('📢 ' + facebookText, 20 + 2 * spacing + spacing / 2, adjustedY + 12, { align: 'center' });
    }
}

// Function to convert height from feet to centimeters
function convertFeetToCm(feetStr) {
    // Check if input is empty
    if (!feetStr) {
        return null;
    }
    
    try {
        // If it's just a number without decimal (e.g., "5"), treat it as feet with 0 inches
        if (!feetStr.includes('.')) {
            const feet = parseFloat(feetStr);
            return Math.round(feet * 30.48); // Convert just feet to cm
        }
        
        const parts = feetStr.split('.');
        const feet = parseFloat(parts[0]);
        let inches = parts[1] ? parseFloat(parts[1]) : 0;
        
        // Handle case where user might enter something like 5.1 meaning 5'1"
        if (inches < 10 && parts[1].length === 1) {
            inches = inches * 10;
        }
        
        // Convert to cm: 1 foot = 30.48 cm, 1 inch = 2.54 cm
        const totalCm = (feet * 30.48) + (inches * 2.54);
        return Math.round(totalCm);
    } catch (e) {
        console.error('Error converting height:', e);
        return null;
    }
}

// Function to handle height unit changes
function setupHeightConverter() {
    const heightInput = document.getElementById('patientHeight');
    const heightUnit = document.getElementById('heightUnit');
    const heightConverted = document.getElementById('heightConverted');
    
    function updateHeightConversion() {
        const value = heightInput.value.trim();
        const unit = heightUnit.value;
        
        if (unit === 'ft') {
            heightConverted.textContent = 'Enter in format: feet.inches (e.g., 5.11 for 5feet 11inches)';
        } else {
            heightConverted.textContent = '';
        }
    }
    
    // Add event listeners
    heightInput.addEventListener('input', updateHeightConversion);
    heightUnit.addEventListener('change', updateHeightConversion);
    
    // Initialize help text based on default selection
    updateHeightConversion();
}

// Function to get the height value in cm regardless of input unit
function getHeightInCm() {
    const heightInput = document.getElementById('patientHeight');
    const heightUnit = document.getElementById('heightUnit');
    const value = heightInput.value.trim();
    const unit = heightUnit.value;
    
    if (!value) {
        return '';
    }
    
    if (unit === 'ft') {
        const cmValue = convertFeetToCm(value);
        return cmValue ? cmValue : '';
    } else {
        // Already in cm
        return value;
    }
} 