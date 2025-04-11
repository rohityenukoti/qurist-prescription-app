// Google Sheets Integration

// Your Google Sheets API credentials
const SPREADSHEET_ID = '1X0cIuwzusx1PNNHcyFeLunnZ9Y7x-d9BCdT0PAhQ_PU';
const API_KEY = 'AIzaSyCpijuiQAj27q6FIVQF9AMv7aiGL8R2iiI';
const CLIENT_ID = '135379719308-1rkd8i49mntdplmg1ghs1vf4t2vjho94.apps.googleusercontent.com';
const API_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

// Initialize the Google Sheets API
function initGoogleSheetsAPI() {
    return new Promise((resolve, reject) => {
        try {
            console.log('Starting GAPI initialization...');
            console.log('Current origin:', window.location.origin);
            
            gapi.load('client:auth2', async () => {
                console.log('GAPI client loaded, initializing...');
                try {
                    const initConfig = {
                        apiKey: API_KEY,
                        clientId: CLIENT_ID,
                        scope: API_SCOPE,
                        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
                    };
                    console.log('Init config:', initConfig);
                    
                    await gapi.client.init(initConfig);
                    console.log('GAPI client initialized');

                    // Check if user is signed in
                    const auth2 = gapi.auth2.getAuthInstance();
                    console.log('Auth2 instance:', auth2);
                    
                    const isSignedIn = auth2.isSignedIn.get();
                    console.log('User sign-in status:', isSignedIn);

                    if (!isSignedIn) {
                        console.log('User not signed in, requesting sign-in...');
                        try {
                            await auth2.signIn({
                                prompt: 'select_account'
                            });
                            console.log('User signed in successfully');
                        } catch (signInError) {
                            console.error('Error during sign-in:', signInError);
                            if (signInError.error === 'popup_blocked_by_browser') {
                                alert('Please allow popups for this site to enable Google Sign-in');
                            }
                            throw signInError;
                        }
                    }

                    resolve();
                } catch (error) {
                    console.error('Error during GAPI initialization:', error);
                    if (error.details) {
                        console.error('Error details:', error.details);
                    }
                    if (error.error === 'idpiframe_initialization_failed') {
                        console.error('Origin verification failed. Please ensure the origin is registered in the Google Cloud Console.');
                        alert('Authorization Error: Please ensure you are accessing this site from an authorized domain.');
                    }
                    reject(error);
                }
            });
        } catch (error) {
            console.error('Error loading GAPI client:', error);
            reject(error);
        }
    });
}

// Save prescription data to Google Sheets
async function savePrescriptionToSheet(prescriptionData) {
    try {
        // Check if API is initialized and user is authenticated
        if (!gapi.client || !gapi.auth2.getAuthInstance().isSignedIn.get()) {
            console.log('API not initialized or user not signed in, attempting to initialize...');
            await initGoogleSheetsAPI();
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

        // Append the data to the sheet
        const response = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:J', // Adjust range as needed
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: values
            }
        });

        console.log('Prescription data saved to Google Sheets:', response);
        return response;
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        if (error.result && error.result.error) {
            console.error('API Error details:', error.result.error);
        }
        throw error;
    }
}

// Export functions
window.initGoogleSheetsAPI = initGoogleSheetsAPI;
window.savePrescriptionToSheet = savePrescriptionToSheet; 