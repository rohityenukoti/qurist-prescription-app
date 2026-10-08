// Google Sheets and Drive Integration

// Your Google API credentials
const SPREADSHEET_ID = '1X0cIuwzusx1PNNHcyFeLunnZ9Y7x-d9BCdT0PAhQ_PU';
const API_KEY = 'AIzaSyCpijuiQAj27q6FIVQF9AMv7aiGL8R2iiI';
const CLIENT_ID = '135379719308-bqao7783qu7evcoh5skku7bopikn8dk6.apps.googleusercontent.com';
const APP_CONFIG_SPREADSHEET_ID = '1uBGaUf0SCkcaLTomxyzeBWn1OEBsmqHTMM3G7LSmAo0';
const PRESCRIPTION_SPREADSHEET_FOLDER_ID = '1FAEg1SG72DoDbBDgCNe1iQO4R3EWV6Iz';
const PRESCRIPTION_SPREADSHEET_TITLE_PREFIX = 'Prescription data';
const VET_PRESCRIPTION_SPREADSHEET_TITLE_PREFIX = 'Vet Prescription Data';
const PRESCRIPTION_SPREADSHEET_IDS_BY_YEAR = {
    2026: SPREADSHEET_ID
};
const VET_PRESCRIPTION_SPREADSHEET_IDS_BY_YEAR = {};
const PRESCRIPTION_HEADERS = [
    'Date',
    'Doctor Name',
    'Order ID',
    'Patient Name',
    'Age',
    'Gender',
    'Height',
    'Weight',
    'Complaints',
    'Comorbidities',
    'Ongoing Medications',
    'Previous Cannabis',
    'Diagnosis',
    'Medications',
    'Notes',
    'Follow Up',
    'PDF URL'
];
const VET_PRESCRIPTION_HEADERS = [
    'Date',
    'Doctor Name',
    'Order ID',
    'Pet Name',
    'Age',
    'Gender',
    'Weight',
    'Complaints',
    'Comorbidities',
    'Ongoing Medications',
    'Previous Cannabis',
    'Diagnosis',
    'Medications',
    'Notes',
    'Follow Up',
    'PDF URL'
];

function getColumnLetter(colIndex) {
    let letter = '';
    while (colIndex > 0) {
        const remainder = (colIndex - 1) % 26;
        letter = String.fromCharCode(65 + remainder) + letter;
        colIndex = Math.floor((colIndex - 1) / 26);
    }
    return letter || 'A';
}
// IDs of folders in Google Drive where PDFs will be stored, by doctor
const DRIVE_FOLDER_IDS = { 
    dr_rohit: '12FVNhVQmwUF_6iw7Ky3JcCRdfc7-Hn9P',
    dr_rachna: '1Kv8U6FbGX4equiElhVB5ydZpgcXGZeFM',
    dr_parul: '1uPj2gdGEOMuFNHdVatYPjrjKniId5TG5',
    dr_mrinal: '1w1lgcR2LQ4WI-kSEp1WnoFpobV6BS2E9'
};
const APP_CONFIG_SHEET_TITLE = 'App Config';
const APP_CONFIG_VERSION_PREFIX = `${APP_CONFIG_SHEET_TITLE} `;
const VET_APP_CONFIG_SHEET_TITLE = 'Vet App Config';
const VET_APP_CONFIG_VERSION_PREFIX = `${VET_APP_CONFIG_SHEET_TITLE} `;
const APP_CONFIG_CHUNK_SIZE = 40000;



let tokenClient;
let accessToken = null;
const prescriptionSpreadsheetIdCache = { ...PRESCRIPTION_SPREADSHEET_IDS_BY_YEAR };

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
        // drive.file only allows uploads to app-created/opened files. Use drive so doctors
        // can upload to folders shared with them (e.g. admin-created prescription folders).
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
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
async function getAccessToken(options = {}) {
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
                prompt: options.prompt || ''
            });
        } catch (error) {
            console.error('Error in getAccessToken:', error);
            hideLoadingOnError();
            reject(error);
        }
    });
}

// Upload a PDF to Google Drive
async function uploadPdfToDrive(pdfBlob, fileName, doctorId = 'dr_rohit', options = {}) {
    try {
        console.log('Uploading PDF to Google Drive...');
        
        // Ensure we have an access token
        if (!accessToken) {
            console.log('No access token found, requesting one...');
            await getAccessToken({ prompt: options.prompt || '' });
        }
        
        if (!accessToken) {
            throw new Error('Failed to obtain access token for Drive upload');
        }

        // Get the correct folder ID based on the doctor.
        const configuredFolderId = typeof window.getDoctorDriveFolderId === 'function'
            ? window.getDoctorDriveFolderId(doctorId)
            : '';
        const folderId = configuredFolderId || DRIVE_FOLDER_IDS[doctorId] || DRIVE_FOLDER_IDS.dr_rohit;
        const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
        console.log('Uploading PDF to Drive folder:', folderId, 'for doctor:', doctorId);

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
                return uploadPdfToDrive(pdfBlob, fileName, doctorId, options);
            }

            if (response.status === 403 && !options.retriedWithConsent) {
                console.log('Drive upload denied. Retrying with fresh Google consent...');
                if (accessToken && typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
                    const tokenToRevoke = accessToken;
                    accessToken = null;
                    google.accounts.oauth2.revoke(tokenToRevoke, () => {});
                } else {
                    accessToken = null;
                }
                await getAccessToken({ prompt: 'consent' });
                return uploadPdfToDrive(pdfBlob, fileName, doctorId, { ...options, retriedWithConsent: true, prompt: 'consent' });
            }
            
            if (response.status === 403) {
                throw new Error(
                    `Google Drive denied the upload. Confirm the signed-in doctor has Editor access to folder ${folderId}. ` +
                    `If an admin created the folder, transfer ownership to the doctor or re-share it as Editor. Details: ${errorText}`
                );
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

function getPrescriptionYear(dateString) {
    let dateObject = new Date(dateString);
    if (isNaN(dateObject.getTime())) {
        dateObject = new Date();
    }

    return dateObject.getFullYear();
}

function getPrescriptionSpreadsheetTitle(year, isVet = false) {
    const prefix = isVet ? VET_PRESCRIPTION_SPREADSHEET_TITLE_PREFIX : PRESCRIPTION_SPREADSHEET_TITLE_PREFIX;
    return `${prefix} ${year}`;
}

function escapeDriveQueryValue(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function findPrescriptionSpreadsheetByTitle(title, retryCount = 0) {
    await ensureAccessToken();

    const query = [
        `'${escapeDriveQueryValue(PRESCRIPTION_SPREADSHEET_FOLDER_ID)}' in parents`,
        `name = '${escapeDriveQueryValue(title)}'`,
        "mimeType = 'application/vnd.google-apps.spreadsheet'",
        'trashed = false'
    ].join(' and ');

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id%2Cname)&spaces=drive`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        if (response.status === 401 && retryCount < 1) {
            accessToken = null;
            await getAccessToken();
            return findPrescriptionSpreadsheetByTitle(title, retryCount + 1);
        }

        const errorText = await response.text();
        throw new Error(`Failed to find prescription spreadsheet '${title}': ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return (result.files || [])[0] || null;
}

async function createPrescriptionSpreadsheet(title, retryCount = 0) {
    await ensureAccessToken();

    const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id%2Cname', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: title,
            mimeType: 'application/vnd.google-apps.spreadsheet',
            parents: [PRESCRIPTION_SPREADSHEET_FOLDER_ID]
        })
    });

    if (!response.ok) {
        if (response.status === 401 && retryCount < 1) {
            accessToken = null;
            await getAccessToken();
            return createPrescriptionSpreadsheet(title, retryCount + 1);
        }

        const errorText = await response.text();
        throw new Error(`Failed to create prescription spreadsheet '${title}': ${response.status} ${errorText}`);
    }

    return response.json();
}

async function getPrescriptionSpreadsheetId(dateString, isVet = false) {
    const year = getPrescriptionYear(dateString);
    const cacheKey = `${isVet ? 'vet_' : ''}${year}`;

    if (prescriptionSpreadsheetIdCache[cacheKey]) {
        return prescriptionSpreadsheetIdCache[cacheKey];
    }

    if (isVet && VET_PRESCRIPTION_SPREADSHEET_IDS_BY_YEAR[year]) {
        prescriptionSpreadsheetIdCache[cacheKey] = VET_PRESCRIPTION_SPREADSHEET_IDS_BY_YEAR[year];
        return prescriptionSpreadsheetIdCache[cacheKey];
    }

    const title = getPrescriptionSpreadsheetTitle(year, isVet);
    const existingSpreadsheet = await findPrescriptionSpreadsheetByTitle(title);
    const spreadsheet = existingSpreadsheet || await createPrescriptionSpreadsheet(title);

    prescriptionSpreadsheetIdCache[cacheKey] = spreadsheet.id;
    return spreadsheet.id;
}

async function ensureSheetExists(spreadsheetId, sheetTitle, retryCount = 0, options = {}) {
    const spreadsheet = await fetchSpreadsheetMetadata(spreadsheetId, retryCount);
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
            return ensureSheetExists(spreadsheetId, sheetTitle, retryCount + 1, options);
        }
        const errorText = await addSheetResponse.text();
        throw new Error(`Failed to create sheet '${sheetTitle}': ${addSheetResponse.status} ${errorText}`);
    }

    // Initialize newly created tab with header row if provided
    if (options && Array.isArray(options.headers) && options.headers.length > 0) {
        try {
            const endCol = getColumnLetter(options.headers.length);
            await updateSheetValues(spreadsheetId, getSheetRange(sheetTitle, `A1:${endCol}1`), [options.headers]);
        } catch (headerError) {
            console.warn('Unable to write headers to new sheet tab:', headerError);
        }
    }
}

async function fetchSpreadsheetMetadata(spreadsheetId, retryCount = 0) {
    // Ensure we have an access token
    if (!accessToken) {
        await getAccessToken();
    }

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
            return fetchSpreadsheetMetadata(spreadsheetId, retryCount + 1);
        }
        const errorText = await metadataResponse.text();
        throw new Error(`Failed to fetch spreadsheet metadata: ${metadataResponse.status} ${errorText}`);
    }

    return metadataResponse.json();
}

function getSheetRange(sheetTitle, range) {
    const escapedTitle = sheetTitle.replace(/'/g, "''");
    return `'${escapedTitle}'!${range}`;
}

async function ensureAccessToken(options = {}) {
    if (!accessToken) {
        await getAccessToken(options);
    }

    if (!accessToken) {
        throw new Error('Failed to obtain access token');
    }
}

async function fetchSheetValues(spreadsheetId, range, retryCount = 0) {
    await ensureAccessToken();

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        if (response.status === 401 && retryCount < 1) {
            accessToken = null;
            await getAccessToken();
            return fetchSheetValues(spreadsheetId, range, retryCount + 1);
        }

        const errorText = await response.text();
        throw new Error(`Failed to fetch sheet values: ${response.status} ${errorText}`);
    }

    return response.json();
}

async function updateSheetValues(spreadsheetId, range, values, retryCount = 0) {
    await ensureAccessToken();

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
    });

    if (!response.ok) {
        if (response.status === 401 && retryCount < 1) {
            accessToken = null;
            await getAccessToken();
            return updateSheetValues(spreadsheetId, range, values, retryCount + 1);
        }

        const errorText = await response.text();
        throw new Error(`Failed to update sheet values: ${response.status} ${errorText}`);
    }

    return response.json();
}

function getConfigSheetTitle(isVet = false) {
    return isVet ? VET_APP_CONFIG_SHEET_TITLE : APP_CONFIG_SHEET_TITLE;
}

function getConfigVersionPrefix(isVet = false) {
    return isVet ? VET_APP_CONFIG_VERSION_PREFIX : APP_CONFIG_VERSION_PREFIX;
}

function getAppConfigVersionSheetTitle(updatedAt = new Date().toISOString(), isVet = false) {
    const safeTimestamp = updatedAt.replace(/[:.]/g, '-');
    return `${getConfigVersionPrefix(isVet)}${safeTimestamp}`;
}

function getAppConfigVersionTimestamp(sheetTitle, isVet = false) {
    const prefix = getConfigVersionPrefix(isVet);
    if (!sheetTitle || !sheetTitle.startsWith(prefix)) {
        return '';
    }

    const safeTimestamp = sheetTitle.slice(prefix.length);
    const match = safeTimestamp.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);
    if (!match) {
        return '';
    }

    return `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`;
}

function getAppConfigVersionLabel(updatedAt) {
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) {
        return updatedAt || 'Unknown date';
    }

    return date.toLocaleString();
}

function parseAppConfigRows(rows, fallbackUpdatedAt = '') {
    const chunkRows = rows.filter(row => /^config:\d+$/.test(row[0] || '') && row[1]);

    if (chunkRows.length) {
        const latestUpdatedAt = chunkRows
            .map(row => row[2] || fallbackUpdatedAt)
            .sort()
            .pop() || fallbackUpdatedAt;
        const configJson = chunkRows
            .filter(row => (row[2] || fallbackUpdatedAt) === latestUpdatedAt)
            .sort((a, b) => Number(a[0].split(':')[1]) - Number(b[0].split(':')[1]))
            .map(row => row[1] || '')
            .join('');

        return {
            config: JSON.parse(configJson),
            updatedAt: latestUpdatedAt
        };
    }

    const configRow = rows.find(row => row[0] === 'config');

    if (!configRow || !configRow[1]) {
        return null;
    }

    return {
        config: JSON.parse(configRow[1]),
        updatedAt: configRow[2] || fallbackUpdatedAt
    };
}

function serializeAppConfigRows(config, updatedAt) {
    const configJson = JSON.stringify(config);
    const chunks = configJson.match(new RegExp(`.{1,${APP_CONFIG_CHUNK_SIZE}}`, 'g')) || [''];

    return [
        ['key', 'json', 'updatedAt'],
        ...chunks.map((chunk, index) => [`config:${index}`, chunk, updatedAt])
    ];
}

async function listAppConfigVersions(options = {}) {
    const isVet = Boolean(options && options.isVet);
    const spreadsheet = await fetchSpreadsheetMetadata(APP_CONFIG_SPREADSHEET_ID);
    return (spreadsheet.sheets || [])
        .map(sheet => (sheet.properties || {}).title || '')
        .map(title => ({
            sheetTitle: title,
            updatedAt: getAppConfigVersionTimestamp(title, isVet)
        }))
        .filter(version => version.updatedAt)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(version => ({
            ...version,
            label: getAppConfigVersionLabel(version.updatedAt)
        }));
}

async function getAppConfigVersionFromSheet(sheetTitle, options = {}) {
    const isVet = Boolean(options && options.isVet);
    if (!getAppConfigVersionTimestamp(sheetTitle, isVet)) {
        throw new Error('Invalid app config version sheet.');
    }

    const range = getSheetRange(sheetTitle, 'A:C');
    const result = await fetchSheetValues(APP_CONFIG_SPREADSHEET_ID, range);
    const parsedConfig = parseAppConfigRows(result.values || [], getAppConfigVersionTimestamp(sheetTitle, isVet));

    if (!parsedConfig || !parsedConfig.config) {
        throw new Error('The selected app config version is empty.');
    }

    return {
        ...parsedConfig,
        sheetTitle,
        label: getAppConfigVersionLabel(parsedConfig.updatedAt)
    };
}

async function restoreAppConfigVersion(sheetTitle, options = {}) {
    const isVet = Boolean(options && options.isVet);
    const version = await getAppConfigVersionFromSheet(sheetTitle, { isVet });
    const saved = await saveAppConfigToSheet(version.config, { isVet });
    return {
        ...saved,
        config: version.config,
        restoredFrom: {
            sheetTitle: version.sheetTitle,
            updatedAt: version.updatedAt,
            label: version.label
        }
    };
}

async function getAppConfigFromSheet(options = {}) {
    await ensureAccessToken(options);
    const isVet = Boolean(options && options.isVet);
    const versions = await listAppConfigVersions({ isVet });
    if (versions.length) {
        return getAppConfigVersionFromSheet(versions[0].sheetTitle, { isVet });
    }

    const baseTitle = getConfigSheetTitle(isVet);
    const spreadsheet = await fetchSpreadsheetMetadata(APP_CONFIG_SPREADSHEET_ID);
    const hasBaseSheet = (spreadsheet.sheets || []).some(sheet => (sheet.properties || {}).title === baseTitle);
    if (!hasBaseSheet) {
        return null;
    }

    const range = getSheetRange(baseTitle, 'A:C');
    const result = await fetchSheetValues(APP_CONFIG_SPREADSHEET_ID, range);
    return parseAppConfigRows(result.values || []);
}

async function saveAppConfigToSheet(config, options = {}) {
    const isVet = Boolean(options && options.isVet);
    const updatedAt = new Date().toISOString();
    const sheetTitle = getAppConfigVersionSheetTitle(updatedAt, isVet);
    const values = serializeAppConfigRows(config, updatedAt);

    await ensureSheetExists(APP_CONFIG_SPREADSHEET_ID, sheetTitle);
    await updateSheetValues(APP_CONFIG_SPREADSHEET_ID, getSheetRange(sheetTitle, `A1:C${values.length}`), values);
    return { updatedAt, sheetTitle };
}

// Save prescription data to Google Sheets, including PDF URL
async function savePrescriptionToSheet(prescriptionData, pdfUrl = '', retryCount = 0, maxRetries = 3, baseDelay = 1000, options = {}) {
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

        const isVet = Boolean(
            (options && options.isVet !== undefined) ? options.isVet :
            (prescriptionData && prescriptionData.isVet !== undefined) ? prescriptionData.isVet :
            (typeof isVetMode !== 'undefined' ? isVetMode : (window.isVetMode || false))
        );

        const headers = isVet ? VET_PRESCRIPTION_HEADERS : PRESCRIPTION_HEADERS;

        // Determine the yearly spreadsheet and monthly sheet title, then ensure the tab exists
        const spreadsheetId = await getPrescriptionSpreadsheetId(prescriptionData.date, isVet);
        const sheetTitle = getMonthlySheetTitle(prescriptionData.date);
        await ensureSheetExists(spreadsheetId, sheetTitle, 0, { headers });

        // Format the data for Google Sheets (vet mode omits Height)
        const row = isVet ? [
            prescriptionData.date,
            prescriptionData.doctorName,
            prescriptionData.orderId || '',
            prescriptionData.patientName,
            prescriptionData.patientAge,
            prescriptionData.patientGender,
            prescriptionData.patientWeight || '',
            prescriptionData.complaints,
            prescriptionData.comorbidities,
            prescriptionData.ongoingMedications,
            prescriptionData.previousCannabis || '',
            prescriptionData.diagnosis || '',
            JSON.stringify(prescriptionData.medications),
            prescriptionData.notes,
            prescriptionData.followUp || '',
            pdfUrl || '' // Add the PDF URL
        ] : [
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
        ];

        const values = [row];
        const endCol = getColumnLetter(row.length);

        console.log('Formatted data:', values);
        console.log(`Attempting to save data to Google Sheets (isVet: ${isVet}, spreadsheetId: ${spreadsheetId})...`);

        // Append the data to the sheet using fetch API
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A:${endCol}:append?valueInputOption=RAW`, {
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
                return savePrescriptionToSheet(prescriptionData, pdfUrl, 0, maxRetries, baseDelay, options);
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
                return savePrescriptionToSheet(prescriptionData, pdfUrl, retryCount + 1, maxRetries, baseDelay, options);
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
window.getAccessToken = getAccessToken;
window.savePrescriptionToSheet = savePrescriptionToSheet;
window.uploadPdfToDrive = uploadPdfToDrive;
window.getAppConfigFromSheet = getAppConfigFromSheet;
window.saveAppConfigToSheet = saveAppConfigToSheet;
window.listAppConfigVersions = listAppConfigVersions;
window.getAppConfigVersionFromSheet = getAppConfigVersionFromSheet;
window.restoreAppConfigVersion = restoreAppConfigVersion;
window.revokeAccess = revokeAccess; 
window.clearGoogleAccessToken = clearGoogleAccessToken;