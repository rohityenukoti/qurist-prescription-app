// Google Sheets and Drive Integration

// Your Google API credentials
const SPREADSHEET_ID = '1X0cIuwzusx1PNNHcyFeLunnZ9Y7x-d9BCdT0PAhQ_PU';
const API_KEY = 'AIzaSyCpijuiQAj27q6FIVQF9AMv7aiGL8R2iiI';
const CLIENT_ID = '135379719308-bqao7783qu7evcoh5skku7bopikn8dk6.apps.googleusercontent.com';
// IDs of folders in Google Drive where PDFs will be stored, by doctor
const DRIVE_FOLDER_IDS = { 
    dr_rohit: '12FVNhVQmwUF_6iw7Ky3JcCRdfc7-Hn9P',
    dr_rachna: '1Kv8U6FbGX4equiElhVB5ydZpgcXGZeFM'
};



let tokenClient;
let accessToken = null;

// Helper function to hide loading spinner during API errors
function hideLoadingOnError() {
    if (typeof hideLoadingOverlay === 'function') {
        hideLoadingOverlay();
    }
}

// Initialize the Google Identity Services and Sheets API
async function initGoogleAPI() {
    return new Promise((resolve, reject) => {
        try {
            console.log('Starting Google API initialization...');
            
            // Check if Google Identity Services is already loaded
            if (window.google && window.google.accounts) {
                console.log('Google Identity Services already loaded');
                initializeTokenClient(resolve, reject);
                return;
            }
            
            // Load the Google Identity Services library
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                console.log('Google Identity Services loaded');
                initializeTokenClient(resolve, reject);
            };

            script.onerror = (error) => {
                console.error('Error loading Google Identity Services:', error);
                hideLoadingOnError();
                reject(error);
            };
            
            document.head.appendChild(script);
        } catch (error) {
            console.error('Error in initGoogleAPI:', error);
            hideLoadingOnError();
            reject(error);
        }
    });
}

function initializeTokenClient(resolve, reject) {
    try {
        // Updated scope to include drive.file access
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    console.log('Access token received in initialization');
                    accessToken = tokenResponse.access_token;
                    resolve();
                }
            },
            error_callback: (error) => {
                console.error('Token client error:', error);
                hideLoadingOnError();
                reject(error);
            }
        });
        
        // Load the Google APIs
        loadGoogleAPIs().then(() => {
            console.log('Google APIs loaded successfully');
            resolve();
        }).catch(error => {
            console.error('Error loading Google APIs:', error);
            hideLoadingOnError();
            reject(error);
        });
    } catch (error) {
        console.error('Error initializing token client:', error);
        hideLoadingOnError();
        reject(error);
    }
}

// Load the Google APIs (Sheets and Drive)
async function loadGoogleAPIs() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        script.onload = () => {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: [
                            'https://sheets.googleapis.com/$discovery/rest?version=v4',
                            'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
                        ]
                    });
                    resolve();
                } catch (error) {
                    hideLoadingOnError();
                    reject(error);
                }
            });
        };

        script.onerror = (error) => {
            hideLoadingOnError();
            reject(error);
        };
    });
}

// Request access token
async function getAccessToken() {
    return new Promise(async (resolve, reject) => {
        try {
            if (!tokenClient) {
                console.log('Initializing Google API...');
                await initGoogleAPI();
            }
            
            // Always request a fresh token to ensure we have an active one
            console.log('Requesting access token...');
            tokenClient.callback = (response) => {
                if (response.access_token) {
                    console.log('Access token received in callback');
                    accessToken = response.access_token;
                    resolve(accessToken);
                } else {
                    hideLoadingOnError();
                    reject(new Error('Failed to get access token'));
                }
            };
            
            tokenClient.requestAccessToken({
                prompt: ''  // Use empty string for silent token refresh when possible
            });
        } catch (error) {
            console.error('Error in getAccessToken:', error);
            hideLoadingOnError();
            reject(error);
        }
    });
}

// Upload a PDF to Google Drive
async function uploadPdfToDrive(pdfBlob, fileName, doctorId = 'dr_rohit') {
    try {
        console.log('Uploading PDF to Google Drive...');
        
        // Ensure we have an access token
        if (!accessToken) {
            console.log('No access token found, requesting one...');
            await getAccessToken();
        }
        
        if (!accessToken) {
            throw new Error('Failed to obtain access token for Drive upload');
        }

        // Get the correct folder ID based on the doctor
        const folderId = DRIVE_FOLDER_IDS[doctorId] || DRIVE_FOLDER_IDS.dr_rohit;

        // Create form data for the file upload
        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify({
            name: fileName,
            mimeType: 'application/pdf',
            parents: [folderId]
        })], { type: 'application/json' }));
        formData.append('file', pdfBlob);

        // Upload the file to Drive
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            
            // Check if token has expired (401 error)
            if (response.status === 401) {
                console.log('Token appears to be expired. Clearing and requesting a new one...');
                // Clear the expired token
                accessToken = null;
                // Try again with a fresh token
                return uploadPdfToDrive(pdfBlob, fileName, doctorId);
            }
            
            throw new Error(`Failed to upload file: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('File uploaded successfully. File ID:', result.id);
        
        // Make the file publicly accessible
        const shareResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${result.id}/permissions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                role: 'reader',
                type: 'anyone'
            })
        });

        if (!shareResponse.ok) {
            const errorText = await shareResponse.text();
            
            // Check if token has expired (401 error)
            if (shareResponse.status === 401) {
                console.log('Token appears to be expired during sharing. Clearing and retrying...');
                // Clear the expired token
                accessToken = null;
                // Try again with a fresh token - need to upload again since we lost the file ID
                return uploadPdfToDrive(pdfBlob, fileName, doctorId);
            }
            
            throw new Error(`Failed to share file: ${shareResponse.status} ${errorText}`);
        }

        // Get the file's web view URL
        const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${result.id}?fields=webViewLink`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!fileResponse.ok) {
            const errorText = await fileResponse.text();
            
            // Check if token has expired (401 error)
            if (fileResponse.status === 401) {
                console.log('Token appears to be expired while getting URL. Clearing and retrying...');
                // Clear the expired token
                accessToken = null;
                // Try again with a fresh token - need to upload again since we lost the file ID
                return uploadPdfToDrive(pdfBlob, fileName, doctorId);
            }
            
            throw new Error(`Failed to get file URL: ${fileResponse.status} ${errorText}`);
        }

        const fileData = await fileResponse.json();
        console.log('File shared successfully. URL:', fileData.webViewLink);
        
        return fileData.webViewLink;
    } catch (error) {
        console.error('Error uploading PDF to Drive:', error);
        hideLoadingOnError();
        throw error;
    }
}

// Save prescription data to Google Sheets, including PDF URL
async function savePrescriptionToSheet(prescriptionData, pdfUrl = '') {
    try {
        console.log('Starting save to Google Sheets...');
        
        // Ensure we have an access token
        if (!accessToken) {
            console.log('No access token found, requesting one...');
            await getAccessToken();
        }
        
        if (!accessToken) {
            throw new Error('Failed to obtain access token');
        }

        // Format the data for Google Sheets, now including PDF URL
        const values = [
            [
                prescriptionData.date,
                prescriptionData.doctorName,
                prescriptionData.orderId || '',
                prescriptionData.patientName,
                prescriptionData.patientAge,
                prescriptionData.patientGender,
                prescriptionData.patientHeight || '',
                prescriptionData.patientWeight || '',
                prescriptionData.complaints,
                prescriptionData.comorbidities,
                prescriptionData.ongoingMedications,
                prescriptionData.previousCannabis || '',
                prescriptionData.diagnosis || '',
                JSON.stringify(prescriptionData.medications),
                prescriptionData.notes,
                prescriptionData.followUp || '',
                pdfUrl || '' // Add the PDF URL as a new column
            ]
        ];

        console.log('Formatted data:', values);
        console.log('Attempting to save data to Google Sheets...');

        // Append the data to the sheet using fetch API (expanded to include the PDF URL column)
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A:Q:append?valueInputOption=RAW`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: values
            })
        });

        const responseText = await response.text();
        console.log('Raw response:', responseText);

        if (!response.ok) {
            // Check if token has expired (401 error)
            if (response.status === 401) {
                console.log('Token appears to be expired while saving to sheets. Clearing and retrying...');
                // Clear the expired token
                accessToken = null;
                // Try again with a fresh token
                return savePrescriptionToSheet(prescriptionData, pdfUrl);
            }
            
            throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
        }

        const result = JSON.parse(responseText);
        console.log('Successfully saved to Google Sheets:', result);
        return result;
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        hideLoadingOnError();
        // Re-throw the error to be handled by the calling code
        throw error;
    }
}

// Revoke access
function revokeAccess() {
    if (accessToken) {
        google.accounts.oauth2.revoke(accessToken, () => {
            console.log('Access token revoked');
            accessToken = null;
        });
    }
}

// Export functions
window.initGoogleAPI = initGoogleAPI;
window.savePrescriptionToSheet = savePrescriptionToSheet;
window.uploadPdfToDrive = uploadPdfToDrive;
window.revokeAccess = revokeAccess; 