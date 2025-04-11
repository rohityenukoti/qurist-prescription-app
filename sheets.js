// Google Sheets Integration

// Your Google Sheets API credentials
const SPREADSHEET_ID = '1X0cIuwzusx1PNNHcyFeLunnZ9Y7x-d9BCdT0PAhQ_PU';
const API_KEY = 'AIzaSyCpijuiQAj27q6FIVQF9AMv7aiGL8R2iiI';
const CLIENT_ID = '135379719308-bqao7783qu7evcoh5skku7bopikn8dk6.apps.googleusercontent.com';

let tokenClient;
let accessToken = null;

// Initialize the Google Identity Services and Sheets API
async function initGoogleAPI() {
    return new Promise((resolve, reject) => {
        try {
            console.log('Starting Google API initialization...');
            
            // Load the Google Identity Services library
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);

            script.onload = async () => {
                console.log('Google Identity Services loaded');
                
                // Initialize token client
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: 'https://www.googleapis.com/auth/spreadsheets',
                    callback: (tokenResponse) => {
                        if (tokenResponse.access_token) {
                            accessToken = tokenResponse.access_token;
                            resolve(tokenResponse);
                        } else {
                            reject(new Error('Failed to get access token'));
                        }
                    },
                });

                // Load the Google Sheets API
                await loadSheetsAPI();
                console.log('Google Sheets API loaded');
            };

            script.onerror = (error) => {
                console.error('Error loading Google Identity Services:', error);
                reject(error);
            };
        } catch (error) {
            console.error('Error in initGoogleAPI:', error);
            reject(error);
        }
    });
}

// Load the Google Sheets API
async function loadSheetsAPI() {
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
                        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
                    });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        };

        script.onerror = (error) => {
            reject(error);
        };
    });
}

// Request access token
async function getAccessToken() {
    if (!tokenClient) {
        await initGoogleAPI();
    }
    
    if (!accessToken) {
        tokenClient.requestAccessToken();
    }
    
    return accessToken;
}

// Save prescription data to Google Sheets
async function savePrescriptionToSheet(prescriptionData) {
    try {
        // Ensure we have an access token
        await getAccessToken();
        
        if (!accessToken) {
            throw new Error('No access token available');
        }

        // Format the data for Google Sheets
        const values = [
            [
                prescriptionData.date,
                prescriptionData.doctorName,
                prescriptionData.patientName,
                prescriptionData.patientAge,
                prescriptionData.patientGender,
                prescriptionData.complaints,
                prescriptionData.comorbidities,
                prescriptionData.ongoingMedications,
                JSON.stringify(prescriptionData.medications),
                prescriptionData.notes
            ]
        ];

        console.log('Attempting to save data to Google Sheets...');

        // Append the data to the sheet using fetch API
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A:J:append?valueInputOption=RAW`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: values
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Prescription data saved to Google Sheets:', result);
        return result;
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
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
window.revokeAccess = revokeAccess; 