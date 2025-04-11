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
            gapi.load('client:auth2', async () => {
                console.log('GAPI client loaded, initializing...');
                try {
                    await gapi.client.init({
                        apiKey: API_KEY,
                        clientId: CLIENT_ID,
                        scope: API_SCOPE,
                        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
                    });

                    console.log('GAPI client initialized');

                    // Check if user is signed in
                    const isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
                    console.log('User sign-in status:', isSignedIn);

                    if (!isSignedIn) {
                        console.log('User not signed in, requesting sign-in...');
                        await gapi.auth2.getAuthInstance().signIn();
                        console.log('User signed in successfully');
                    }

                    resolve();
                } catch (error) {
                    console.error('Error during GAPI initialization:', error);
                    if (error.details) {
                        console.error('Error details:', error.details);
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