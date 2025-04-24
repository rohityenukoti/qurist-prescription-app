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
            'Orally -- 30 minutes before bedtime -- After Dinner',
            'Orally -- After Breakfast',
            'Orally -- After Lunch',
            'Orally -- As and When Required (SOS)',
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
        "• Call +91 9485848844 if you have any further queries.",
        "• Inform your treating physician about using CBD for your medical condition.",
        "• Follow sleep hygiene measures as discussed.",
        "• Maintain age-appropriate healthy nutrition and physical activity as discussed for your medical condition."
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
    // Reset doctor selection
    document.getElementById('doctorSelect').value = '';
    
    // Reset patient information
    document.getElementById('patientName').value = '';
    document.getElementById('patientAge').value = '';
    document.getElementById('patientGender').value = '';
    
    // Reset medical information
    document.getElementById('complaints').value = '';
    // Uncheck all complaints checkboxes
    document.querySelectorAll('.complaints-checklist input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.getElementById('comorbidities').value = '';
    document.getElementById('ongoingMedications').value = '';
    
    // Reset follow-up
    document.getElementById('followUpType').value = '';
    document.getElementById('customFollowUpDate').value = '';
    document.getElementById('customFollowUpDate').style.display = 'none';
    
    // Reset date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Reset notes to default (without gender since it's been reset)
    document.getElementById('notes').value = getDefaultNotes();
    
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
        currentNotes.includes("• Call +91 9485848844")) {
        notesTextarea.value = getDefaultNotes(gender, selectedMeds);
    }
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
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
    document.getElementById('generatePdfBtn').addEventListener('click', function() {
        const doctorSelect = document.getElementById('doctorSelect').value;
        if (!doctorSelect) {
            alert('Please select a doctor to generate the prescription. This is required for the signature and seal.');
        } else {
            generatePrescriptionPDF();
        }
    });
    
    // Add event listener for Save to Google Sheets button
    document.getElementById('saveToSheetsBtn').addEventListener('click', async function() {
        const button = this;
        const originalText = button.textContent;
        
        try {
            console.log('Save to Sheets button clicked');
            
            // Show loading state
            button.textContent = 'Saving...';
            button.disabled = true;

            // Get all form data
            const prescriptionData = {
                date: document.getElementById('date').value,
                doctorName: document.getElementById('doctorSelect').value === 'dr_rohit' 
                    ? 'Dr. Rohit Yenukoti' 
                    : 'Dr. Rachna Chandra',
                patientName: document.getElementById('patientName').value,
                patientAge: document.getElementById('patientAge').value,
                patientGender: document.getElementById('patientGender').value,
                complaints: document.getElementById('complaints').value,
                comorbidities: document.getElementById('comorbidities').value || 'None',
                ongoingMedications: document.getElementById('ongoingMedications').value || 'None',
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

            // Wait for the entire save process to complete
            await savePrescriptionToSheet(prescriptionData);
            
            alert('Prescription data saved to Google Sheets successfully!');
        } catch (error) {
            console.error('Error in save to sheets handler:', error);
            alert('Error saving to Google Sheets: ' + error.message);
        } finally {
            // Reset button state
            button.textContent = originalText;
            button.disabled = false;
        }
    });
    
    // Function to generate the prescription PDF
    function generatePrescriptionPDF() {
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

        // Get form data
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
        const patientName = document.getElementById('patientName').value;
        const patientAge = document.getElementById('patientAge').value;
        const patientGender = document.getElementById('patientGender').value;
        
        const complaints = document.getElementById('complaints').value;
        const comorbidities = document.getElementById('comorbidities').value || 'None';
        const ongoingMedications = document.getElementById('ongoingMedications').value || 'None';
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
        const doc = new jsPDF();
        
        // Add header image
        const headerImg = document.getElementById('headerImage');
        if (headerImg.complete && headerImg.naturalHeight !== 0) {
            const headerAspectRatio = headerImg.naturalWidth / headerImg.naturalHeight;
            const headerWidth = 190;
            const headerHeight = headerWidth / headerAspectRatio;
            doc.addImage(headerImg, 'PNG', 10, 10, headerWidth, headerHeight);
            const startY = headerHeight + 20;
        }
        
        // Add Rx symbol
        const rxImg = document.getElementById('rxImage');
        if (rxImg.complete && rxImg.naturalHeight !== 0) {
            const rxWidth = 18; // Small size for Rx symbol
            const rxHeight = 20;
            doc.addImage(rxImg, 'PNG', 20, 55, rxWidth, rxHeight);
        }
        
        // Add patient info in a single line with tighter spacing
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        
        // First group: Name
        doc.text(`Name:`, 20, 45);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0); // Set to black
        doc.text(`${patientName}`, 37, 45);
        
        // Second group: Age
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text(`Age:`, 105, 45);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0); // Set to black
        doc.text(`${patientAge}`, 117, 45);
        
        // Third group: Sex
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text(`Sex:`, 130, 45);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0); // Set to black
        doc.text(`${patientGender}`, 142, 45);
        
        // Fourth group: Date
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text(`Date:`, 165, 45);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0); // Set to black
        doc.text(`${formatDate(date)}`, 178, 45);
        
        // Draw underlines with adjusted widths
        doc.setLineWidth(0.5);
        doc.setDrawColor(2, 113, 128); // Set Blue Lagoon color for underlines
        doc.line(35, 46, 100, 46);   // Name underline
        doc.line(115, 46, 125, 46);  // Age underline
        doc.line(140, 46, 160, 46);  // Gender underline
        doc.line(176, 46, 205, 46);  // Date underline
        
        // Add doctor information on the right side
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text(selectedDoctor.name, 145, 60);
        doc.setFontSize(10);
        doc.text(selectedDoctor.designation, 145, 65);
        
        // Add complaints
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text('Complaints:', 20, 85);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0); // Set to black
        doc.text(complaints, 20, 92, { maxWidth: 170 });
        
        // Create table for comorbidities and ongoing medications
        let currentY = doc.getTextDimensions(complaints, { maxWidth: 170 }).h + 100;
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
                    const headerWidth = 190;
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
            
            // Add follow-up text if available
            if (followUpText) {
                const followUpY = finalY + 7 + (splitNotes.length * 5) + 5;
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(2, 113, 128);
                doc.text(followUpText, 20, followUpY);
            }
            
            // Add signature on the right side at the same level
            const signatureImg = document.getElementById(
                doctorSelect === 'dr_rachna' ? 'rachnaSignature' : 'rohitSignature'
            );
            
            if (signatureImg.complete && signatureImg.naturalHeight !== 0) {
                const signWidth = 15;
                const signHeight = (signWidth * signatureImg.naturalHeight) / signatureImg.naturalWidth;
                doc.addImage(signatureImg, 'PNG', 150, finalY - 5, signWidth, signHeight);
            }
            
            // Add seal to the right of signature
            drawDoctorSeal(doc, 185, finalY, selectedDoctor);
            
            doc.line(140, finalY + 10, 190, finalY + 10);
            doc.text("Doctor's Signature", 165, finalY + 15, { align: 'center' });
            
            finalY += notesHeight;
        }
        
        // Add footer image at the bottom of the last page
        const footerImg = document.getElementById('footerImage');
        if (footerImg.complete && footerImg.naturalHeight !== 0) {
            const footerAspectRatio = footerImg.naturalWidth / footerImg.naturalHeight;
            const footerWidth = 190;
            const footerHeight = footerWidth / footerAspectRatio;
            // Position footer 10 units from bottom
            doc.addImage(footerImg, 'PNG', 10, doc.internal.pageSize.height - footerHeight - 10,
                footerWidth, footerHeight);
        }
        
        // Before saving the PDF, add the final page count
        doc.setProperties({
            title: `Prescription for ${patientName}`,
            subject: 'Medical Prescription',
            creator: 'Qurist Digital Prescription System'
        });

        // Update the last page's continuation text with the final page count
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addPageContinuationText(doc, i, totalPages);
        }

        // Save the PDF
        doc.save(`${patientName}_${formatDate(date)}.pdf`);
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

    // Add event delegation for medication changes
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