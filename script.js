// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
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
                <input type="text" id="medication${medicationCounter}" class="medication-name" required>
            </div>
            <div class="form-group">
                <label for="dosage${medicationCounter}">Dosage:</label>
                <input type="text" id="dosage${medicationCounter}" class="medication-dosage" required>
            </div>
            <div class="form-group">
                <label for="frequency${medicationCounter}">Frequency:</label>
                <input type="text" id="frequency${medicationCounter}" class="medication-frequency" required>
            </div>
            <div class="form-group">
                <label for="duration${medicationCounter}">Duration:</label>
                <input type="text" id="duration${medicationCounter}" class="medication-duration" required>
            </div>
            <button type="button" class="remove-medication-btn">Remove</button>
        `;
        
        // Add the new medication entry to the container
        document.getElementById('medicationsContainer').appendChild(medicationEntry);
        
        // Add event listener to the remove button
        medicationEntry.querySelector('.remove-medication-btn').addEventListener('click', function() {
            medicationEntry.remove();
        });
    });
    
    // Add event listener to the "Generate Prescription" button
    document.getElementById('generatePdfBtn').addEventListener('click', function() {
        // Check if the form is valid
        const form = document.getElementById('prescriptionForm');
        if (!isFormValid()) {
            alert('Please fill in all required fields.');
            return;
        }
        
        // Generate the PDF
        generatePrescriptionPDF();
    });
    
    // Function to check if the form is valid
    function isFormValid() {
        // Remove validation check to allow empty prescriptions
        return true;
    }
    
    // Function to generate the prescription PDF
    function generatePrescriptionPDF() {
        // Get form data
        const doctorSelect = document.getElementById('doctorSelect').value;
        
        // Define doctor information based on selection
        const doctorInfo = {
            dr_rohit: {
                name: "Dr. Rohit Yenukoti",
                designation: "MBBS"
            },
            dr_rachna: {
                name: "Dr. Rachna Chandra",
                designation: "MBBS, MD"
            }
        };

        const selectedDoctor = doctorInfo[doctorSelect] || {};
        
        // Get other form data
        const patientName = document.getElementById('patientName').value;
        const patientAge = document.getElementById('patientAge').value;
        const patientGender = document.getElementById('patientGender').value;
        
        const complaints = document.getElementById('complaints').value;
        const comorbidities = document.getElementById('comorbidities').value;
        const ongoingMedications = document.getElementById('ongoingMedications').value;
        const notes = document.getElementById('notes').value;
        const date = document.getElementById('date').value || new Date().toISOString().split('T')[0];
        
        // Get medications
        const medications = [];
        const medicationEntries = document.querySelectorAll('.medication-entry');
        
        medicationEntries.forEach(entry => {
            const name = entry.querySelector('.medication-name').value;
            const dosage = entry.querySelector('.medication-dosage').value;
            const frequency = entry.querySelector('.medication-frequency').value;
            const duration = entry.querySelector('.medication-duration').value;
            
            medications.push({
                name,
                dosage,
                frequency,
                duration
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
        doc.setTextColor(0, 0, 0);
        doc.text(`${patientName}`, 37, 45);
        
        // Second group: Age
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text(`Age:`, 105, 45);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`${patientAge}`, 117, 45);
        
        // Third group: Sex
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text(`Sex:`, 130, 45);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`${patientGender}`, 142, 45);
        
        // Fourth group: Date
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text(`Date:`, 165, 45);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
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
        doc.text('Complaints:', 20, 85);
        doc.setFont('helvetica', 'normal');
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
        
        // Add medications
        doc.setFont('helvetica', 'bold');
        doc.text('Recommendations:', 20, currentY);
        
        // Create medication table with automatic page break
        const tableColumn = ["Medication", "Dosage", "Frequency", "Duration"];
        const tableRows = [];
        
        medications.forEach(med => {
            const medData = [
                med.name,
                med.dosage,
                med.frequency,
                med.duration
            ];
            tableRows.push(medData);
        });
        
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: currentY + 5,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 3
            },
            headStyles: {
                fillColor: [66, 139, 202]
            },
            // Enable automatic page break
            willDrawPage: function(data) {
                // Add header image on new pages
                const headerImg = document.getElementById('headerImage');
                if (headerImg.complete && headerImg.naturalHeight !== 0) {
                    const headerAspectRatio = headerImg.naturalWidth / headerImg.naturalHeight;
                    const headerWidth = 190;
                    const headerHeight = headerWidth / headerAspectRatio;
                    doc.addImage(headerImg, 'PNG', 10, 10, headerWidth, headerHeight);
                }
            }
        });
        
        // Calculate remaining space needed
        let finalY = doc.lastAutoTable.finalY + 10;
        
        // Add notes if any
        if (notes) {
            doc.setFont('helvetica', 'bold');
            doc.text('Additional Notes:', 20, finalY);
            doc.setFont('helvetica', 'normal');
            
            // Calculate height needed for notes
            const splitNotes = doc.splitTextToSize(notes, 170);
            const notesHeight = splitNotes.length * 5; // Approximate height per line
            
            // Add new page if notes won't fit
            if (finalY + notesHeight + 60 > doc.internal.pageSize.height - 40) {
                doc.addPage();
                finalY = 20;
            }
            
            doc.text(splitNotes, 20, finalY + 7);
            finalY += notesHeight + 15;
        }
        
        // Add signature
        const signatureY = finalY + 10;
        
        // Add new page if signature won't fit
        if (signatureY + 40 > doc.internal.pageSize.height - 40) {
            doc.addPage();
            finalY = 20;
        }
        
        doc.line(140, signatureY, 190, signatureY);
        doc.text("Doctor's Signature", 165, signatureY + 5, { align: 'center' });
        
        // Add footer image at the bottom of the last page
        const footerImg = document.getElementById('footerImage');
        if (footerImg.complete && footerImg.naturalHeight !== 0) {
            const footerAspectRatio = footerImg.naturalWidth / footerImg.naturalHeight;
            const footerWidth = 190;
            const footerHeight = footerWidth / footerAspectRatio;
            doc.addImage(footerImg, 'PNG', 10, doc.internal.pageSize.height - footerHeight - 10,
                footerWidth, footerHeight);
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
}); 