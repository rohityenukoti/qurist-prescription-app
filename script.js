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
        const requiredInputs = document.querySelectorAll('#prescriptionForm [required]');
        for (let input of requiredInputs) {
            if (!input.value.trim()) {
                return false;
            }
        }
        return true;
    }
    
    // Function to generate the prescription PDF
    function generatePrescriptionPDF() {
        // Get form data
        const doctorName = document.getElementById('doctorName').value;
        const doctorLicense = document.getElementById('doctorLicense').value;
        const clinicName = document.getElementById('clinicName').value;
        const clinicAddress = document.getElementById('clinicAddress').value;
        
        const patientName = document.getElementById('patientName').value;
        const patientAge = document.getElementById('patientAge').value;
        const patientGender = document.getElementById('patientGender').value;
        const patientAddress = document.getElementById('patientAddress').value;
        
        const diagnosis = document.getElementById('diagnosis').value;
        const notes = document.getElementById('notes').value;
        const date = document.getElementById('date').value;
        
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
            const headerWidth = 190; // Max width for A4 page with margins
            const headerHeight = headerWidth / headerAspectRatio;
            doc.addImage(headerImg, 'PNG', 10, 10, headerWidth, headerHeight);
            
            // Adjust starting Y position for the rest of the content
            const startY = headerHeight + 20;
            
            // Update all Y positions below by adding startY to them
            doc.text(clinicName, 105, startY + 20, { align: 'center' });
            doc.text(clinicAddress, 105, startY + 30, { align: 'center', maxWidth: 180 });
            doc.text(`Dr. ${doctorName}`, 20, startY + 45);
            doc.text(`License: ${doctorLicense}`, 20, startY + 52);
        }
        
        // Add prescription title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('PRESCRIPTION', 105, 65, { align: 'center' });
        
        // Add date
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${formatDate(date)}`, 170, 45, { align: 'right' });
        
        // Add patient info
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Patient Information:', 20, 80);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${patientName}`, 20, 90);
        doc.text(`Age: ${patientAge}`, 20, 97);
        doc.text(`Gender: ${patientGender}`, 20, 104);
        doc.text(`Address: ${patientAddress}`, 20, 111, { maxWidth: 180 });
        
        // Add diagnosis
        doc.setFont('helvetica', 'bold');
        doc.text('Diagnosis:', 20, 125);
        doc.setFont('helvetica', 'normal');
        doc.text(diagnosis, 70, 125);
        
        // Add medications
        doc.setFont('helvetica', 'bold');
        doc.text('Medications:', 20, 140);
        
        // Create medication table
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
            startY: 145,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 3
            },
            headStyles: {
                fillColor: [66, 139, 202]
            }
        });
        
        // Add notes if any
        if (notes) {
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFont('helvetica', 'bold');
            doc.text('Additional Notes:', 20, finalY);
            doc.setFont('helvetica', 'normal');
            doc.text(notes, 20, finalY + 7, { maxWidth: 170 });
        }
        
        // Add signature
        const signatureY = notes ? doc.lastAutoTable.finalY + 40 : doc.lastAutoTable.finalY + 30;
        doc.line(140, signatureY, 190, signatureY);
        doc.text("Doctor's Signature", 165, signatureY + 5, { align: 'center' });
        
        // Add footer image before saving
        const footerImg = document.getElementById('footerImage');
        if (footerImg.complete && footerImg.naturalHeight !== 0) {
            const footerAspectRatio = footerImg.naturalWidth / footerImg.naturalHeight;
            const footerWidth = 190; // Max width for A4 page with margins
            const footerHeight = footerWidth / footerAspectRatio;
            doc.addImage(footerImg, 'PNG', 10, doc.internal.pageSize.height - footerHeight - 10, 
                footerWidth, footerHeight);
        }
        
        // Save the PDF
        doc.save(`Prescription_${patientName}_${formatDate(date)}.pdf`);
    }
    
    // Helper function to format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}); 