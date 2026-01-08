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

// Expose a safe way for other scripts to clear the in-scope token.
// (Note: `let accessToken` is not the same as `window.accessToken`.)
function clearGoogleAccessToken() {
    accessToken = null;
}

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
        const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

        // Create form data for the file upload
        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify({
            name: fileName,
            mimeType: 'application/pdf',
            parents: [folderId]
        })], { type: 'application/json' }));
        formData.append('file', pdfBlob);

        // Upload the file to Drive
        //
        // IMPORTANT (GitHub Pages + CORS):
        // The Drive *upload* endpoint often fails CORS preflight when using the `Authorization` header from a static site.
        // Using `access_token` as a query parameter avoids the browser preflight for this POST (since we don't set non-simple headers).
        const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&access_token=${encodeURIComponent(accessToken)}`;
        const response = await fetch(uploadUrl, {
            method: 'POST',
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
        
        // From here on, NEVER re-upload the PDF just because the token expired while sharing/getting URL.
        // Re-uploading creates duplicate Drive files (what you're seeing as "uploaded three times").
        const fileId = result.id;

        // Expose info for the UI to tell the user where to find the file if link fetching fails.
        // (This is especially helpful when running from GitHub Pages where some Drive calls can be CORS-blocked.)
        window.lastDriveUploadInfo = { fileId, folderId, folderUrl, fileName };

        // Make the file publicly accessible (best-effort).
        // Note: this request uses JSON which can trigger CORS preflight; if it fails, we still try to continue.
        try {
            const shareResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
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
                if (shareResponse.status === 401) {
                    console.log('Token expired during sharing. Refreshing token and retrying share (no re-upload).');
                    accessToken = null;
                    await getAccessToken();
                    // Retry once with refreshed token
                    const retryShare = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ role: 'reader', type: 'anyone' })
                    });
                    if (!retryShare.ok) {
                        const retryText = await retryShare.text();
                        console.warn(`Failed to share file after token refresh: ${retryShare.status} ${retryText}`);
                    }
                } else {
                    console.warn(`Failed to share file: ${shareResponse.status} ${errorText}`);
                }
            }
        } catch (e) {
            console.warn('Sharing step failed (continuing to get link anyway):', e);
        }

        // Get the file's web view URL (best-effort).
        // If this fails, the upload still succeeded — return an empty URL and let the UI tell the user to open the Drive folder.
        try {
            const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!fileResponse.ok) {
                const errorText = await fileResponse.text();
                if (fileResponse.status === 401) {
                    console.log('Token expired while getting URL. Refreshing token and retrying get-link (no re-upload).');
                    accessToken = null;
                    await getAccessToken();
                    const retryFileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (!retryFileResponse.ok) {
                        const retryText = await retryFileResponse.text();
                        console.warn(`Upload succeeded but failed to fetch link after token refresh: ${retryFileResponse.status} ${retryText}`);
                        return '';
                    }
                    const retryData = await retryFileResponse.json();
                    console.log('File link fetched successfully. URL:', retryData.webViewLink);
                    return retryData.webViewLink || '';
                }

                console.warn(`Upload succeeded but failed to fetch link: ${fileResponse.status} ${errorText}`);
                return '';
            }

            const fileData = await fileResponse.json();
            console.log('File link fetched successfully. URL:', fileData.webViewLink);

            return fileData.webViewLink || '';
        } catch (e) {
            console.warn('Upload succeeded but link fetch failed (continuing without link):', e);
            return '';
        }
    } catch (error) {
        // In browsers, CORS/preflight failures surface as a generic TypeError "Failed to fetch".
        // Add a clearer hint for static hosting (GitHub Pages) scenarios.
        if (error instanceof TypeError && /Failed to fetch/i.test(error.message || '')) {
            console.error(
                'Drive upload failed at the network/CORS layer. ' +
                'If you are running this from GitHub Pages, Drive uploads may be blocked by CORS. ' +
                'Consider using an Apps Script / server-side proxy for Drive uploads.'
            );
        }
        console.error('Error uploading PDF to Drive:', error);
        hideLoadingOnError();
        throw error;
    }
}

// Helpers for monthly sheet handling
function getMonthlySheetTitle(dateString) {
    const monthAbbreviations = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let dateObject = new Date(dateString);
    if (isNaN(dateObject.getTime())) {
        // Fallback to current date if parsing fails
        dateObject = new Date();
    }
    const monthTitle = `${monthAbbreviations[dateObject.getMonth()]} ${dateObject.getFullYear()}`;
    return monthTitle;
}

async function ensureSheetExists(spreadsheetId, sheetTitle, retryCount = 0) {
    // Ensure we have an access token
    if (!accessToken) {
        await getAccessToken();
    }

    // Get spreadsheet metadata to check existing sheets
    const metadataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!metadataResponse.ok) {
        if (metadataResponse.status === 401 && retryCount < 1) {
            // Refresh token and retry once
            accessToken = null;
            await getAccessToken();
            return ensureSheetExists(spreadsheetId, sheetTitle, retryCount + 1);
        }
        const errorText = await metadataResponse.text();
        throw new Error(`Failed to fetch spreadsheet metadata: ${metadataResponse.status} ${errorText}`);
    }

    const spreadsheet = await metadataResponse.json();
    const sheets = (spreadsheet.sheets || []).map(s => (s.properties || {}).title);
    const sheetAlreadyExists = sheets.includes(sheetTitle);

    if (sheetAlreadyExists) {
        return;
    }

    // Create the sheet if it doesn't exist
    const addSheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            requests: [
                {
                    addSheet: {
                        properties: {
                            title: sheetTitle
                        }
                    }
                }
            ]
        })
    });

    if (!addSheetResponse.ok) {
        if (addSheetResponse.status === 401 && retryCount < 1) {
            // Refresh token and retry once
            accessToken = null;
            await getAccessToken();
            return ensureSheetExists(spreadsheetId, sheetTitle, retryCount + 1);
        }
        const errorText = await addSheetResponse.text();
        throw new Error(`Failed to create sheet '${sheetTitle}': ${addSheetResponse.status} ${errorText}`);
    }
}

// Save prescription data to Google Sheets, including PDF URL
async function savePrescriptionToSheet(prescriptionData, pdfUrl = '', retryCount = 0, maxRetries = 3, baseDelay = 1000) {
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

        // Determine the monthly sheet title and ensure it exists
        const sheetTitle = getMonthlySheetTitle(prescriptionData.date);
        await ensureSheetExists(SPREADSHEET_ID, sheetTitle);

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
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetTitle)}!A:Q:append?valueInputOption=RAW`, {
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
            
            const retryableErrors = [500, 502, 503, 504];
            if (retryableErrors.includes(response.status) && retryCount < maxRetries) {
                console.log(`Server error (${response.status}). Retry attempt ${retryCount + 1} of ${maxRetries}`);
                
                // Calculate delay with exponential backoff
                const delay = baseDelay * Math.pow(2, retryCount);
                console.log(`Waiting ${delay}ms before retrying...`);
                
                // Update loading message to show retry status
                if (typeof updateLoadingMessage === 'function') {
                    updateLoadingMessage(`Service temporarily unavailable. Retrying in ${delay/1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`);
                }
                
                // Wait for the calculated delay
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Retry the save operation with incremented retry count
                return savePrescriptionToSheet(prescriptionData, pdfUrl, retryCount + 1, maxRetries, baseDelay);
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
window.clearGoogleAccessToken = clearGoogleAccessToken;