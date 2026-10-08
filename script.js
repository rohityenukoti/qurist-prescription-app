// Authentication variables
let currentUser = null;
let isVetMode = false;
window.isVetMode = false;
let selectedLoginRole = 'doctor';
const DOCTOR_EMAILS = ['rohit@qurist.in', 'rachna@qurist.in', 'drparul@qurist.in', 'dr.vismaya@qurist.in', 'dr.mrinal@qurist.in'];
const VET_EMAILS = ['drsatish@qurist.in', 'rohityenukoti@qurist.in'];
const ALLOWED_EMAILS = DOCTOR_EMAILS;
const ADMIN_EMAILS = ['rohit@qurist.in', 'rohityenukoti@qurist.in', 'samisht@qurist.in', 'shivam@qurist.in', 'hello@qurist.in'];
const CONFIG_CACHE_KEY = 'quristAppConfig';
const VET_CONFIG_CACHE_KEY = 'quristVetAppConfig';
let appConfig = normalizeOilDosageValues(window.mergeQuristConfig ? window.mergeQuristConfig() : {});
let appConfigMeta = { source: 'defaults', updatedAt: '' };
let medicationCounter = 1;

const ADMIN_OPTION_EDITORS = {
    adminComplaints: {
        type: 'lines',
        singularLabel: 'complaint option',
        pluralLabel: 'complaint options',
        addLabel: 'Add complaint',
        placeholder: 'Complaint option'
    },
    adminMedications: {
        type: 'medications',
        singularLabel: 'medication',
        pluralLabel: 'medications',
        addLabel: 'Add medication'
    },
    adminDoctors: {
        type: 'doctors',
        singularLabel: 'doctor',
        pluralLabel: 'doctors',
        addLabel: 'Add doctor'
    },
    adminOilDosages: {
        type: 'dosages',
        singularLabel: 'oil dosage',
        pluralLabel: 'oil dosages',
        addLabel: 'Add oil dosage'
    },
    adminPillDosages: {
        type: 'dosages',
        singularLabel: 'pill dosage',
        pluralLabel: 'pill dosages',
        addLabel: 'Add pill dosage'
    },
    adminGummyDosages: {
        type: 'dosages',
        singularLabel: 'gummy dosage',
        pluralLabel: 'gummy dosages',
        addLabel: 'Add gummy dosage'
    },
    adminOilInstructions: {
        type: 'lines',
        singularLabel: 'oil instruction',
        pluralLabel: 'oil instructions',
        addLabel: 'Add oil instruction',
        placeholder: 'Oil instruction'
    },
    adminOtherInstructions: {
        type: 'lines',
        singularLabel: 'pill/gummy instruction',
        pluralLabel: 'pill/gummy instructions',
        addLabel: 'Add pill/gummy instruction',
        placeholder: 'Pill/gummy instruction'
    }
};

function isEmailAllowed(email, allowedEmails) {
    return allowedEmails.some(
        allowed => allowed.toLowerCase() === email ||
            email.includes(allowed.split('@')[0].toLowerCase())
    );
}

function getCachedConfig(isVet = isVetMode) {
    try {
        const key = isVet ? VET_CONFIG_CACHE_KEY : CONFIG_CACHE_KEY;
        const cached = localStorage.getItem(key);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.warn('Unable to read cached app config:', error);
        return null;
    }
}

function setCachedConfig(config, updatedAt = '', isVet = isVetMode) {
    try {
        const key = isVet ? VET_CONFIG_CACHE_KEY : CONFIG_CACHE_KEY;
        localStorage.setItem(key, JSON.stringify({ config, updatedAt }));
    } catch (error) {
        console.warn('Unable to cache app config:', error);
    }
}

function normalizeOilDosageValues(config) {
    if (isVetMode || !config || !config.dosageOptions || !Array.isArray(config.dosageOptions.oil)) {
        return config;
    }

    const canonicalOilDosages = {
        '0.25ml': '0.25ml (1/4 ml)',
        '0.25ml(1/4ml)': '0.25ml (1/4 ml)',
        '0.5ml': '0.5ml (1/2 ml)',
        '0.5ml(1/2ml)': '0.5ml (1/2 ml)',
        '0.75ml': '0.75ml (3/4 ml)',
        '0.75ml(3/4ml)': '0.75ml (3/4 ml)',
        '1ml': '1ml'
    };

    config.dosageOptions.oil = config.dosageOptions.oil.map(dosage => {
        const displayText = dosage.value || '';
        const normalizedKey = displayText.toLowerCase().replace(/\s+/g, '');
        const value = canonicalOilDosages[normalizedKey] || displayText;
        return {
            value
        };
    });

    return config;
}

function applyAppConfig(config, meta = {}) {
    const isVet = meta.isVet !== undefined ? meta.isVet : isVetMode;
    if (isVet) {
        appConfig = window.mergeQuristVetConfig ? window.mergeQuristVetConfig(config) : config;
    } else {
        appConfig = normalizeOilDosageValues(window.mergeQuristConfig ? window.mergeQuristConfig(config) : config);
    }

    if (currentUser) {
        currentUser.isDoctor = isVet ? isEmailAllowed(currentUser.email, getConfiguredVetEmails()) : isEmailAllowed(currentUser.email, getConfiguredDoctorEmails());
    }
    appConfigMeta = {
        source: meta.source || 'defaults',
        updatedAt: meta.updatedAt || ''
    };
    renderConfigDrivenFields();
    updateNotesIfDefault();
    updateAdminVisibility();
    updateAdminStatus();
}

function loadCachedAppConfig(isVet = isVetMode) {
    const cached = getCachedConfig(isVet);
    if (cached && cached.config) {
        applyAppConfig(cached.config, { source: 'cache', updatedAt: cached.updatedAt || '', isVet });
    } else {
        applyAppConfig({}, { source: 'defaults', isVet });
    }
}

async function loadRemoteAppConfig(options = {}) {
    const silent = Boolean(options.silent);
    const isVet = options.isVet !== undefined ? options.isVet : isVetMode;
    try {
        if (typeof window.getAppConfigFromSheet !== 'function') {
            throw new Error('App config sheet helper is unavailable.');
        }

        const result = await window.getAppConfigFromSheet({ prompt: options.prompt, isVet });
        if (result && result.config) {
            applyAppConfig(result.config, { source: 'google-sheet', updatedAt: result.updatedAt || '', isVet });
            setCachedConfig(appConfig, result.updatedAt || '', isVet);
        }
        return result;
    } catch (error) {
        console.warn('Unable to load remote app config:', error);
        if (!silent) {
            alert(`Could not load ${isVet ? 'veterinarian ' : ''}admin settings from Google Sheets. The app is using the latest local/default settings.`);
        }
        return null;
    }
}

function getMedicationConfig(medicationId) {
    return (appConfig.medications || []).find(med => med.id === medicationId) || null;
}

function normalizeDoctorId(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function getDoctorConfig(doctorId) {
    return (appConfig.doctors || []).find(doctor => doctor.id === doctorId) || null;
}

function getConfiguredDoctorEmails() {
    const configEmails = (appConfig.doctors || [])
        .map(doctor => doctor.email)
        .filter(Boolean);
    const mergedEmails = [...new Set([...configEmails, ...DOCTOR_EMAILS].map(email => email.toLowerCase()))];
    return mergedEmails.length ? mergedEmails : DOCTOR_EMAILS;
}

function getConfiguredVetEmails() {
    const configEmails = (appConfig.doctors || [])
        .map(doctor => doctor.email)
        .filter(Boolean);
    const mergedEmails = [...new Set([...configEmails, ...VET_EMAILS].map(email => email.toLowerCase()))];
    return mergedEmails.length ? mergedEmails : VET_EMAILS;
}

function getDoctorForEmail(email) {
    const normalizedEmail = String(email || '').toLowerCase();
    return (appConfig.doctors || []).find(doctor => {
        const doctorEmail = String(doctor.email || '').toLowerCase();
        return doctorEmail && isEmailAllowed(normalizedEmail, [doctorEmail]);
    }) || null;
}

function getDoctorDriveFolderId(doctorId) {
    const doctor = getDoctorConfig(doctorId);
    return doctor && doctor.driveFolderId ? doctor.driveFolderId : '';
}

function renderDoctorOptions() {
    const doctorSelect = document.getElementById('doctorSelect');
    if (!doctorSelect) {
        return;
    }

    const doctorSelectLabel = document.querySelector('label[for="doctorSelect"]');
    if (doctorSelectLabel) {
        doctorSelectLabel.textContent = isVetMode ? 'Select Veterinarian:' : 'Select Doctor:';
    }

    const selectedValue = doctorSelect.value;
    const defaultOptionText = isVetMode ? 'Select Veterinarian' : 'Select Doctor';
    doctorSelect.innerHTML = `<option value="">${defaultOptionText}</option>`;
    (appConfig.doctors || []).forEach(doctor => {
        addSelectOption(doctorSelect, doctor.id, doctor.name || doctor.id);
    });

    if (selectedValue && getDoctorConfig(selectedValue)) {
        doctorSelect.value = selectedValue;
    }

    setDoctorSelectionForCurrentUser();
}

function getMedicationType(medicationId) {
    const medication = getMedicationConfig(medicationId);
    if (medication && medication.type) {
        return medication.type;
    }
    if (medicationId.includes('CBD') || medicationId.includes('THC')) {
        return 'oil';
    }
    if (medicationId.includes('Pills')) {
        return 'pills';
    }
    if (medicationId.includes('Gummies')) {
        return 'gummies';
    }
    return 'other';
}

function getInstructionOptionsForMedication(medicationId) {
    const type = getMedicationType(medicationId);
    return appConfig.instructionOptions[type] || appConfig.instructionOptions.other || [];
}

function getDosageOptionsForMedication(medicationId) {
    const type = getMedicationType(medicationId);
    return appConfig.dosageOptions[type] || appConfig.dosageOptions.other || [];
}

function addSelectOption(select, value, label) {
    select.add(new Option(label, value));
}

function renderMedicationOptions(select) {
    if (!select) {
        return;
    }

    const selectedValue = select.value;
    select.innerHTML = '<option value="">Select Medication</option>';
    (appConfig.medications || []).forEach(medication => {
        addSelectOption(select, medication.id, medication.label || medication.id);
    });
    addSelectOption(select, 'custom', 'Custom medication...');
    select.value = selectedValue;
}

function renderAllMedicationOptions() {
    document.querySelectorAll('.medication-name').forEach(select => {
        renderMedicationOptions(select);
    });
}

function createCheckboxItem(value) {
    const wrapper = document.createElement('div');
    wrapper.className = 'checkbox-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = value;

    const label = document.createElement('label');
    label.textContent = value;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    return wrapper;
}

function renderComplaintsChecklist() {
    const complaintsChecklistDiv = document.querySelector('.complaints-checklist');
    if (!complaintsChecklistDiv) {
        return;
    }

    complaintsChecklistDiv.innerHTML = '';
    (appConfig.complaints || []).forEach(complaint => {
        complaintsChecklistDiv.appendChild(createCheckboxItem(complaint));
    });
}

function renderConfigDrivenFields() {
    renderDoctorOptions();
    renderComplaintsChecklist();
    renderAllMedicationOptions();
}

function getElementValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : '';
}

function setElementValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value || '';
        if (element.tagName === 'TEXTAREA') {
            autoResizeTextArea(element);
        }
    }
}

function parseLines(value) {
    return String(value || '')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
}

function serializeLines(values) {
    return (values || []).join('\n');
}

function parseDosageLines(value) {
    return parseLines(value).map(line => ({ value: line }));
}

function serializeDosageLines(values) {
    return (values || [])
        .map(dosage => dosage.value || '')
        .filter(Boolean)
        .join('\n');
}

function parseMedicationLines(value) {
    return parseLines(value).map(line => {
        const parts = line.split('|').map(part => part.trim());
        const label = parts[0] || '';
        return {
            id: label,
            label,
            pdfName: parts[1] || label,
            type: parts[2] || 'other'
        };
    });
}

function serializeMedicationLines(values) {
    return (values || [])
        .map(medication => `${medication.label || medication.id} | ${medication.pdfName || medication.label || medication.id} | ${medication.type || 'other'}`)
        .join('\n');
}

function parseDoctorJson(value) {
    try {
        const doctors = JSON.parse(value || '[]');
        return Array.isArray(doctors) ? doctors : [];
    } catch (error) {
        console.warn('Unable to parse doctor setup:', error);
        return [];
    }
}

function serializeDoctorJson(values) {
    return JSON.stringify(values || []);
}

function createAdminOptionCell(tagName = 'input', options = {}) {
    const cell = document.createElement(tagName);
    cell.className = 'admin-option-cell';
    if (tagName === 'input') {
        cell.type = 'text';
    }
    if (options.placeholder) {
        cell.placeholder = options.placeholder;
    }
    if (options.value) {
        cell.value = options.value;
    }
    if (options.name) {
        cell.dataset.field = options.name;
    }
    return cell;
}

function createAdminDoctorField(labelText, field) {
    const wrapper = document.createElement('div');
    wrapper.className = 'admin-doctor-field';

    const label = document.createElement('span');
    label.textContent = labelText;
    wrapper.appendChild(label);
    wrapper.appendChild(field);

    return wrapper;
}

function getAdminDoctorRowTitle(row) {
    const name = row.querySelector('[data-field="name"]')?.value.trim() || '';
    const email = row.querySelector('[data-field="email"]')?.value.trim() || '';
    const id = row.querySelector('[data-field="id"]')?.value.trim() || '';
    const defaultLabel = isVetMode ? 'New veterinarian' : 'New doctor';
    return name || email || id || defaultLabel;
}

function updateAdminDoctorRowTitle(row) {
    const title = row.querySelector('.admin-doctor-name');
    if (title) {
        title.textContent = getAdminDoctorRowTitle(row);
    }
}

function getAdminOptionData(id) {
    const editor = ADMIN_OPTION_EDITORS[id];
    const value = getElementValue(id);

    if (!editor) {
        return [];
    }
    if (editor.type === 'medications') {
        return parseMedicationLines(value);
    }
    if (editor.type === 'doctors') {
        return parseDoctorJson(value);
    }
    if (editor.type === 'dosages') {
        return parseDosageLines(value);
    }
    return parseLines(value);
}

function getAdminOptionCount(id) {
    return getAdminOptionData(id).length;
}

function updateAdminOptionSummary(id) {
    const editor = ADMIN_OPTION_EDITORS[id];
    const shell = document.querySelector(`[data-admin-option-editor="${id}"]`);
    const summary = shell ? shell.querySelector('.admin-option-summary') : null;
    if (!editor || !summary) {
        return;
    }

    const count = getAdminOptionCount(id);
    const label = count === 1 ? editor.singularLabel : editor.pluralLabel;
    summary.textContent = `${count} ${label}`;
}

function createAdminLineOptionRow(value = '', editor = {}) {
    const row = document.createElement('div');
    row.className = 'admin-option-row';

    row.appendChild(createAdminOptionCell('input', {
        name: 'value',
        placeholder: editor.placeholder || 'Option',
        value
    }));
    row.appendChild(createAdminRemoveOptionButton());
    return row;
}

function createAdminDosageOptionRow(dosage = {}) {
    const row = document.createElement('div');
    row.className = 'admin-option-row';

    row.appendChild(createAdminOptionCell('input', {
        name: 'value',
        placeholder: 'Dosage option',
        value: dosage.value || ''
    }));
    row.appendChild(createAdminRemoveOptionButton());
    return row;
}

function createAdminMedicationOptionRow(medication = {}) {
    const row = document.createElement('div');
    row.className = 'admin-option-row admin-option-row-medication';

    row.appendChild(createAdminOptionCell('input', {
        name: 'label',
        placeholder: 'Dropdown name',
        value: medication.label || medication.id || ''
    }));
    row.appendChild(createAdminOptionCell('input', {
        name: 'pdfName',
        placeholder: 'PDF name',
        value: medication.pdfName || medication.label || medication.id || ''
    }));

    const typeSelect = createAdminOptionCell('select', { name: 'type' });
    ['oil', 'pills', 'gummies', 'other'].forEach(type => {
        typeSelect.add(new Option(type, type));
    });
    typeSelect.value = medication.type || 'other';
    row.appendChild(typeSelect);
    row.appendChild(createAdminRemoveOptionButton());
    return row;
}

function createAdminDoctorOptionRow(doctor = {}) {
    const row = document.createElement('div');
    row.className = 'admin-option-row admin-option-row-doctor';

    const header = document.createElement('div');
    header.className = 'admin-doctor-row-header';

    const doctorName = document.createElement('strong');
    doctorName.className = 'admin-doctor-name';
    header.appendChild(doctorName);

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'admin-doctor-edit-btn secondary';
    editButton.textContent = 'Edit';
    header.appendChild(editButton);

    const details = document.createElement('div');
    details.className = 'admin-doctor-details';
    details.hidden = true;

    const idLabel = isVetMode ? 'Veterinarian ID' : 'Doctor ID';
    const nameLabel = isVetMode ? 'Veterinarian name' : 'Doctor name';
    const emailLabel = isVetMode ? 'Veterinarian email' : 'Doctor email';
    const desigPlaceholder = isVetMode ? 'BVSc & AH' : 'MBBS, MD';

    details.appendChild(createAdminDoctorField(idLabel, createAdminOptionCell('input', {
        name: 'id',
        placeholder: idLabel,
        value: doctor.id || ''
    })));
    details.appendChild(createAdminDoctorField(nameLabel, createAdminOptionCell('input', {
        name: 'name',
        placeholder: nameLabel,
        value: doctor.name || ''
    })));
    details.appendChild(createAdminDoctorField('Designation', createAdminOptionCell('input', {
        name: 'designation',
        placeholder: desigPlaceholder,
        value: doctor.designation || ''
    })));
    details.appendChild(createAdminDoctorField('Registration no.', createAdminOptionCell('input', {
        name: 'regNo',
        placeholder: 'Registration no.',
        value: doctor.regNo || ''
    })));
    details.appendChild(createAdminDoctorField(emailLabel, createAdminOptionCell('input', {
        name: 'email',
        placeholder: emailLabel,
        value: doctor.email || ''
    })));
    details.appendChild(createAdminDoctorField('Drive folder ID', createAdminOptionCell('input', {
        name: 'driveFolderId',
        placeholder: 'Drive folder ID',
        value: doctor.driveFolderId || ''
    })));

    const signatureInput = document.createElement('input');
    signatureInput.type = 'hidden';
    signatureInput.dataset.field = 'signatureDataUrl';
    signatureInput.value = doctor.signatureDataUrl || '';
    row.appendChild(signatureInput);

    const uploadCell = document.createElement('div');
    uploadCell.className = 'admin-signature-upload';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpeg';
    fileInput.className = 'admin-signature-file';
    uploadCell.appendChild(fileInput);

    const signatureStatus = document.createElement('span');
    signatureStatus.className = 'admin-signature-status';
    signatureStatus.textContent = doctor.signatureDataUrl ? 'Signature saved' : 'No signature';
    uploadCell.appendChild(signatureStatus);

    const clearSignatureButton = document.createElement('button');
    clearSignatureButton.type = 'button';
    clearSignatureButton.className = 'admin-clear-signature-btn secondary';
    clearSignatureButton.textContent = 'Clear signature';
    uploadCell.appendChild(clearSignatureButton);

    details.appendChild(createAdminDoctorField('Signature', uploadCell));
    details.appendChild(createAdminRemoveOptionButton());

    row.appendChild(header);
    row.appendChild(details);
    row.appendChild(signatureInput);
    updateAdminDoctorRowTitle(row);
    return row;
}

function createAdminRemoveOptionButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'admin-remove-option-btn secondary';
    button.textContent = 'Remove';
    return button;
}

function getAdminOptionRemoveLabel(row, editor) {
    if (!row || !editor) {
        return 'this item';
    }

    if (editor.type === 'medications') {
        const label = row.querySelector('[data-field="label"]')?.value.trim();
        const pdfName = row.querySelector('[data-field="pdfName"]')?.value.trim();
        return label || pdfName || editor.singularLabel || 'this medication';
    }

    if (editor.type === 'doctors') {
        const name = row.querySelector('[data-field="name"]')?.value.trim();
        const email = row.querySelector('[data-field="email"]')?.value.trim();
        const id = row.querySelector('[data-field="id"]')?.value.trim();
        const defaultLabel = isVetMode ? 'this veterinarian' : 'this doctor';
        return name || email || id || editor.singularLabel || defaultLabel;
    }

    const value = row.querySelector('[data-field="value"]')?.value.trim();
    return value || editor.singularLabel || 'this item';
}

function confirmAdminAction(message, options = {}) {
    const overlay = document.getElementById('adminRemoveConfirmLightbox');
    const titleEl = document.getElementById('adminRemoveConfirmTitle');
    const messageEl = document.getElementById('adminRemoveConfirmMessage');
    const confirmBtn = document.getElementById('confirmAdminRemoveBtn');
    const cancelBtn = document.getElementById('cancelAdminRemoveBtn');

    if (!overlay || !messageEl || !confirmBtn || !cancelBtn) {
        return Promise.resolve(window.confirm(message));
    }

    return new Promise(resolve => {
        const originalTitle = titleEl ? titleEl.textContent : '';
        const originalConfirmText = confirmBtn.textContent;
        const close = confirmed => {
            overlay.classList.remove('show');
            overlay.setAttribute('aria-hidden', 'true');
            if (titleEl) {
                titleEl.textContent = originalTitle;
            }
            confirmBtn.textContent = originalConfirmText;
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
            overlay.removeEventListener('click', onOverlayClick);
            document.removeEventListener('keydown', onKeydown);
            resolve(confirmed);
        };
        const onConfirm = () => close(true);
        const onCancel = () => close(false);
        const onOverlayClick = event => {
            if (event.target === overlay) {
                close(false);
            }
        };
        const onKeydown = event => {
            if (event.key === 'Escape') {
                close(false);
            }
        };

        if (titleEl) {
            titleEl.textContent = options.title || 'Confirm action';
        }
        messageEl.textContent = message;
        confirmBtn.textContent = options.confirmLabel || 'Confirm';
        overlay.classList.add('show');
        overlay.setAttribute('aria-hidden', 'false');
        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
        overlay.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onKeydown);
        cancelBtn.focus();
    });
}

function confirmAdminOptionRemoval(row, editor) {
    const itemLabel = getAdminOptionRemoveLabel(row, editor);
    const message = `Remove "${itemLabel}"? This change is not published until you save admin settings.`;
    return confirmAdminAction(message, {
        title: 'Confirm remove',
        confirmLabel: 'Remove'
    });
}

function createEmptyAdminOptionRow(id) {
    const editor = ADMIN_OPTION_EDITORS[id];
    if (!editor) {
        return document.createElement('div');
    }
    if (editor.type === 'medications') {
        return createAdminMedicationOptionRow();
    }
    if (editor.type === 'doctors') {
        return createAdminDoctorOptionRow();
    }
    if (editor.type === 'dosages') {
        return createAdminDosageOptionRow();
    }
    return createAdminLineOptionRow('', editor);
}

function renderAdminOptionEditorRows(id) {
    const editor = ADMIN_OPTION_EDITORS[id];
    const shell = document.querySelector(`[data-admin-option-editor="${id}"]`);
    const rowsContainer = shell ? shell.querySelector('.admin-option-rows') : null;
    if (!editor || !rowsContainer) {
        return;
    }

    rowsContainer.innerHTML = '';
    const data = getAdminOptionData(id);
    data.forEach(item => {
        if (editor.type === 'medications') {
            rowsContainer.appendChild(createAdminMedicationOptionRow(item));
        } else if (editor.type === 'doctors') {
            rowsContainer.appendChild(createAdminDoctorOptionRow(item));
        } else if (editor.type === 'dosages') {
            rowsContainer.appendChild(createAdminDosageOptionRow(item));
        } else {
            rowsContainer.appendChild(createAdminLineOptionRow(item, editor));
        }
    });

    if (!data.length) {
        const emptyState = document.createElement('p');
        emptyState.className = 'admin-option-empty';
        emptyState.textContent = 'No options yet. Use the add button below to create one.';
        rowsContainer.appendChild(emptyState);
    }

    updateAdminOptionSummary(id);
}

function syncAdminOptionEditorToTextarea(id) {
    const editor = ADMIN_OPTION_EDITORS[id];
    const textarea = document.getElementById(id);
    const shell = document.querySelector(`[data-admin-option-editor="${id}"]`);
    const rows = shell ? Array.from(shell.querySelectorAll('.admin-option-row')) : [];
    if (!editor || !textarea || !shell) {
        return;
    }

    let value = '';
    if (editor.type === 'medications') {
        value = rows
            .map(row => {
                const label = row.querySelector('[data-field="label"]')?.value.trim() || '';
                const pdfName = row.querySelector('[data-field="pdfName"]')?.value.trim() || '';
                const type = row.querySelector('[data-field="type"]')?.value || 'other';
                return label || pdfName ? `${label} | ${pdfName || label} | ${type}` : '';
            })
            .filter(Boolean)
            .join('\n');
    } else if (editor.type === 'doctors') {
        const doctors = rows
            .map(row => {
                updateAdminDoctorRowTitle(row);
                const name = row.querySelector('[data-field="name"]')?.value.trim() || '';
                const id = normalizeDoctorId(row.querySelector('[data-field="id"]')?.value || name);
                const designation = row.querySelector('[data-field="designation"]')?.value.trim() || '';
                const regNo = row.querySelector('[data-field="regNo"]')?.value.trim() || '';
                const email = row.querySelector('[data-field="email"]')?.value.trim().toLowerCase() || '';
                const driveFolderId = row.querySelector('[data-field="driveFolderId"]')?.value.trim() || '';
                const signatureDataUrl = row.querySelector('[data-field="signatureDataUrl"]')?.value || '';
                if (!id && !name && !email) {
                    return null;
                }
                return {
                    id,
                    name,
                    designation,
                    regNo,
                    email,
                    driveFolderId,
                    signatureDataUrl
                };
            })
            .filter(Boolean);
        value = serializeDoctorJson(doctors);
    } else if (editor.type === 'dosages') {
        value = rows
            .map(row => {
                return row.querySelector('[data-field="value"]')?.value.trim() || '';
            })
            .filter(Boolean)
            .join('\n');
    } else {
        value = rows
            .map(row => row.querySelector('[data-field="value"]')?.value.trim() || '')
            .filter(Boolean)
            .join('\n');
    }

    textarea.value = value;
    updateAdminOptionSummary(id);
}

function readSignatureFile(fileInput, row, editorId) {
    const file = fileInput.files && fileInput.files[0];
    const signatureInput = row.querySelector('[data-field="signatureDataUrl"]');
    const signatureStatus = row.querySelector('.admin-signature-status');

    if (!file || !signatureInput) {
        return;
    }

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
        if (signatureStatus) {
            signatureStatus.textContent = 'Choose a PNG or JPG file';
        }
        fileInput.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function () {
        signatureInput.value = reader.result || '';
        if (signatureStatus) {
            signatureStatus.textContent = file.name;
        }
        syncAdminOptionEditorToTextarea(editorId);
    };
    reader.onerror = function () {
        if (signatureStatus) {
            signatureStatus.textContent = 'Could not read file';
        }
    };
    reader.readAsDataURL(file);
}

function getImageFormatFromDataUrl(dataUrl) {
    return /^data:image\/jpe?g/i.test(dataUrl || '') ? 'JPEG' : 'PNG';
}

function syncAllAdminOptionEditors() {
    Object.keys(ADMIN_OPTION_EDITORS).forEach(syncAdminOptionEditorToTextarea);
}

function renderAllAdminOptionEditors() {
    Object.keys(ADMIN_OPTION_EDITORS).forEach(renderAdminOptionEditorRows);
}

function initializeAdminOptionEditors() {
    Object.entries(ADMIN_OPTION_EDITORS).forEach(([id, editor]) => {
        const textarea = document.getElementById(id);
        const formGroup = textarea ? textarea.closest('.form-group') : null;
        if (!textarea || !formGroup || formGroup.dataset.adminOptionInitialized === 'true') {
            return;
        }

        formGroup.dataset.adminOptionInitialized = 'true';
        textarea.classList.add('admin-backing-field');

        const shell = document.createElement('div');
        shell.className = 'admin-option-editor';
        shell.dataset.adminOptionEditor = id;
        shell.innerHTML = `
            <div class="admin-option-editor-bar">
                <span class="admin-option-summary"></span>
                <button type="button" class="admin-option-toggle secondary">Edit</button>
            </div>
            <div class="admin-option-panel" hidden>
                <div class="admin-option-rows"></div>
                <button type="button" class="admin-add-option-btn secondary">${editor.addLabel}</button>
            </div>
        `;

        formGroup.appendChild(shell);

        const toggleButton = shell.querySelector('.admin-option-toggle');
        const panel = shell.querySelector('.admin-option-panel');
        const rowsContainer = shell.querySelector('.admin-option-rows');
        const addButton = shell.querySelector('.admin-add-option-btn');

        if (editor.type === 'doctors') {
            shell.classList.add('admin-doctor-editor');
            panel.hidden = false;
            toggleButton.remove();
        }

        toggleButton.addEventListener('click', function () {
            if (panel.hidden) {
                renderAdminOptionEditorRows(id);
                panel.hidden = false;
                this.textContent = 'Done';
                const firstCell = rowsContainer.querySelector('.admin-option-cell');
                if (firstCell) {
                    firstCell.focus();
                }
            } else {
                syncAdminOptionEditorToTextarea(id);
                panel.hidden = true;
                this.textContent = 'Edit';
            }
        });

        addButton.addEventListener('click', function () {
            const emptyState = rowsContainer.querySelector('.admin-option-empty');
            if (emptyState) {
                emptyState.remove();
            }
            const row = createEmptyAdminOptionRow(id);
            rowsContainer.appendChild(row);
            if (editor.type === 'doctors') {
                const details = row.querySelector('.admin-doctor-details');
                const editButton = row.querySelector('.admin-doctor-edit-btn');
                if (details && editButton) {
                    details.hidden = false;
                    editButton.textContent = 'Done';
                }
            }
            syncAdminOptionEditorToTextarea(id);
            const firstCell = row.querySelector('.admin-option-cell');
            if (firstCell) {
                firstCell.focus();
            }
        });

        rowsContainer.addEventListener('input', function () {
            syncAdminOptionEditorToTextarea(id);
        });
        rowsContainer.addEventListener('change', function (event) {
            if (event.target.classList.contains('admin-signature-file')) {
                readSignatureFile(event.target, event.target.closest('.admin-option-row'), id);
                return;
            }
            syncAdminOptionEditorToTextarea(id);
        });
        rowsContainer.addEventListener('click', async function (event) {
            if (event.target.classList.contains('admin-doctor-edit-btn')) {
                const row = event.target.closest('.admin-option-row-doctor');
                const details = row ? row.querySelector('.admin-doctor-details') : null;
                if (!details) {
                    return;
                }

                details.hidden = !details.hidden;
                event.target.textContent = details.hidden ? 'Edit' : 'Done';
                if (!details.hidden) {
                    const firstCell = details.querySelector('.admin-option-cell');
                    if (firstCell) {
                        firstCell.focus();
                    }
                } else {
                    syncAdminOptionEditorToTextarea(id);
                }
                return;
            }
            if (event.target.classList.contains('admin-clear-signature-btn')) {
                const row = event.target.closest('.admin-option-row');
                const signatureInput = row.querySelector('[data-field="signatureDataUrl"]');
                const signatureStatus = row.querySelector('.admin-signature-status');
                const fileInput = row.querySelector('.admin-signature-file');
                if (signatureInput) {
                    signatureInput.value = '';
                }
                if (fileInput) {
                    fileInput.value = '';
                }
                if (signatureStatus) {
                    signatureStatus.textContent = 'No signature';
                }
                syncAdminOptionEditorToTextarea(id);
                return;
            }
            if (!event.target.classList.contains('admin-remove-option-btn')) {
                return;
            }
            const row = event.target.closest('.admin-option-row');
            if (!row || !(await confirmAdminOptionRemoval(row, editor))) {
                return;
            }
            row.remove();
            if (!rowsContainer.querySelector('.admin-option-row')) {
                const emptyState = document.createElement('p');
                emptyState.className = 'admin-option-empty';
                emptyState.textContent = 'No options yet. Use the add button below to create one.';
                rowsContainer.appendChild(emptyState);
            }
            syncAdminOptionEditorToTextarea(id);
        });

        renderAdminOptionEditorRows(id);
    });
}

function parseFooter(value) {
    const parts = String(value || '').split('|').map(part => part.trim());
    return {
        companyName: parts[0] || '',
        cin: parts[1] || '',
        website: parts[2] || '',
        instagram: parts[3] || '',
        facebook: parts[4] || ''
    };
}

function serializeFooter(footer) {
    const currentFooter = footer || {};
    return [
        currentFooter.companyName || '',
        currentFooter.cin || '',
        currentFooter.website || '',
        currentFooter.instagram || '',
        currentFooter.facebook || ''
    ].join(' | ');
}

function populateAdminForm(config = appConfig) {
    const isVet = isVetMode;
    const modalTitle = document.getElementById('adminModalTitle');
    const modalSubtitle = document.getElementById('adminModalSubtitle');
    const doctorHeading = document.getElementById('adminDoctorSetupHeading');
    const doctorSubheading = document.getElementById('adminDoctorSetupSubheading');
    const doctorLabel = document.getElementById('adminDoctorSetupLabel');
    const doctorHelp = document.getElementById('adminDoctorSetupHelp');

    if (modalTitle) {
        modalTitle.textContent = isVet ? 'Admin Mode (Veterinarian)' : 'Admin Mode';
    }
    if (modalSubtitle) {
        modalSubtitle.textContent = isVet
            ? 'Edit safe app content for veterinary prescriptions. Changes are saved to the Vet App Config tab in Google Sheets.'
            : 'Edit safe app content. Changes are saved to the App Config tab in Google Sheets.';
    }
    if (doctorHeading) {
        doctorHeading.textContent = isVet ? 'Veterinarian setup' : 'Doctor setup';
    }
    if (doctorSubheading) {
        doctorSubheading.textContent = isVet
            ? 'Manage veterinarian access, Drive folders, and signatures for pet prescriptions.'
            : 'Manage doctor access, Drive folders, and signatures before editing the rest of the app settings.';
    }
    if (doctorLabel) {
        doctorLabel.textContent = isVet ? 'Veterinarian setup' : 'Doctor setup';
    }
    if (doctorHelp) {
        doctorHelp.textContent = isVet
            ? 'Click Edit to add, remove, or update veterinarians, Drive folders, and signatures. Uploaded signatures are saved in the Google Sheets app config.'
            : 'Click Edit to add, remove, or update doctors, Drive folders, and signatures. Uploaded signatures are saved in the Google Sheets app config.';
    }

    if (ADMIN_OPTION_EDITORS.adminDoctors) {
        ADMIN_OPTION_EDITORS.adminDoctors.singularLabel = isVet ? 'veterinarian' : 'doctor';
        ADMIN_OPTION_EDITORS.adminDoctors.pluralLabel = isVet ? 'veterinarians' : 'doctors';
        ADMIN_OPTION_EDITORS.adminDoctors.addLabel = isVet ? 'Add veterinarian' : 'Add doctor';
    }

    setElementValue('adminComplaints', serializeLines(config.complaints));
    setElementValue('adminMedications', serializeMedicationLines(config.medications));
    setElementValue('adminDoctors', serializeDoctorJson(config.doctors));
    setElementValue('adminOilDosages', serializeDosageLines(config.dosageOptions ? config.dosageOptions.oil : []));
    setElementValue('adminPillDosages', serializeDosageLines(config.dosageOptions ? config.dosageOptions.pills : []));
    setElementValue('adminGummyDosages', serializeDosageLines(config.dosageOptions ? config.dosageOptions.gummies : []));
    setElementValue('adminOilInstructions', serializeLines(config.instructionOptions ? config.instructionOptions.oil : []));
    setElementValue('adminOtherInstructions', serializeLines(config.instructionOptions ? config.instructionOptions.other : []));
    setElementValue('adminBaseNotes', serializeLines(config.defaultNotes ? config.defaultNotes.base : []));
    setElementValue('adminFemaleNote', (config.defaultNotes && config.defaultNotes.female) || '');
    setElementValue('adminOilNotes', serializeLines(config.defaultNotes ? config.defaultNotes.oil : []));
    setElementValue('adminPillGummyNotes', serializeLines(config.defaultNotes ? config.defaultNotes.pillsOrGummies : []));
    setElementValue('adminFooter', serializeFooter(config.footer));
    setElementValue('adminTelehealthNotice', (config.pdfText && config.pdfText.telehealthNotice) || '');
    setElementValue('adminTravelAdvisory', (config.pdfText && config.pdfText.travelAdvisory) || '');
    setElementValue('adminSafetyAdvisory', (config.pdfText && config.pdfText.safetyAdvisory) || '');
    setElementValue('adminOccupationalSafety', (config.pdfText && config.pdfText.occupationalSafetyAdvisory) || '');
    setElementValue('adminPatientAgreement', (config.pdfText && config.pdfText.patientAgreement) || '');
    setElementValue('adminContactInformation', (config.pdfText && config.pdfText.contactInformation) || '');
    renderAllAdminOptionEditors();
}

function buildConfigFromAdminForm() {
    syncAllAdminOptionEditors();
    if (isVetMode) {
        const currentDefaults = window.cloneQuristVetConfig ? window.cloneQuristVetConfig(window.QURIST_DEFAULT_VET_CONFIG) : {};
        const config = {
            version: 1,
            complaints: parseLines(getElementValue('adminComplaints')),
            medications: parseMedicationLines(getElementValue('adminMedications')),
            dosageOptions: {
                oil: parseDosageLines(getElementValue('adminOilDosages')),
                pills: [],
                gummies: [],
                other: []
            },
            instructionOptions: {
                oil: parseLines(getElementValue('adminOilInstructions')),
                other: []
            },
            defaultNotes: {
                base: parseLines(getElementValue('adminBaseNotes')).map(note => note.replace(/^•\s*/, '')),
                female: '',
                oil: [],
                pillsOrGummies: []
            },
            pdfText: {
                telehealthNotice: getElementValue('adminTelehealthNotice').trim(),
                travelAdvisory: getElementValue('adminTravelAdvisory').trim(),
                safetyAdvisory: getElementValue('adminSafetyAdvisory').trim(),
                occupationalSafetyAdvisory: '',
                patientAgreement: getElementValue('adminPatientAgreement').trim(),
                contactInformation: getElementValue('adminContactInformation').trim()
            },
            doctors: parseDoctorJson(getElementValue('adminDoctors')),
            footer: parseFooter(getElementValue('adminFooter'))
        };
        return config;
    }

    const currentDefaults = window.cloneQuristConfig ? window.cloneQuristConfig(window.QURIST_DEFAULT_APP_CONFIG) : {};
    const config = {
        version: 1,
        complaints: parseLines(getElementValue('adminComplaints')),
        medications: parseMedicationLines(getElementValue('adminMedications')),
        dosageOptions: {
            oil: parseDosageLines(getElementValue('adminOilDosages')),
            pills: parseDosageLines(getElementValue('adminPillDosages')),
            gummies: parseDosageLines(getElementValue('adminGummyDosages')),
            other: currentDefaults.dosageOptions ? currentDefaults.dosageOptions.other : []
        },
        instructionOptions: {
            oil: parseLines(getElementValue('adminOilInstructions')),
            other: parseLines(getElementValue('adminOtherInstructions'))
        },
        defaultNotes: {
            base: parseLines(getElementValue('adminBaseNotes')).map(note => note.replace(/^•\s*/, '')),
            female: getElementValue('adminFemaleNote').trim().replace(/^•\s*/, ''),
            oil: parseLines(getElementValue('adminOilNotes')).map(note => note.replace(/^•\s*/, '')),
            pillsOrGummies: parseLines(getElementValue('adminPillGummyNotes')).map(note => note.replace(/^•\s*/, ''))
        },
        pdfText: {
            telehealthNotice: getElementValue('adminTelehealthNotice').trim(),
            travelAdvisory: getElementValue('adminTravelAdvisory').trim(),
            safetyAdvisory: getElementValue('adminSafetyAdvisory').trim(),
            occupationalSafetyAdvisory: getElementValue('adminOccupationalSafety').trim(),
            patientAgreement: getElementValue('adminPatientAgreement').trim(),
            contactInformation: getElementValue('adminContactInformation').trim()
        },
        footer: parseFooter(getElementValue('adminFooter'))
    };
    config.doctors = parseDoctorJson(getElementValue('adminDoctors'));

    return normalizeOilDosageValues(config);
}

function validateAdminConfig(config, isVet = isVetMode) {
    const errors = [];
    const validMedicationTypes = ['oil', 'pills', 'gummies', 'other'];

    if (!config.complaints || !config.complaints.length) {
        errors.push('Add at least one complaint option.');
    }

    if (!config.medications || !config.medications.length) {
        errors.push('Add at least one medication option.');
    }

    const medicationIds = new Set();
    (config.medications || []).forEach((medication, index) => {
        if (!medication.label) {
            errors.push(`Medication row ${index + 1} is missing a dropdown name.`);
        }
        if (!validMedicationTypes.includes(medication.type)) {
            errors.push(`Medication "${medication.label}" must use type oil, pills, gummies, or other.`);
        }
        if (medicationIds.has((medication.id || medication.label).toLowerCase())) {
            errors.push(`Medication "${medication.label}" is duplicated.`);
        }
        medicationIds.add((medication.id || medication.label).toLowerCase());
    });

    const practitionerLabel = isVet ? 'veterinarian' : 'doctor';
    if (!config.doctors || !config.doctors.length) {
        errors.push(`Add at least one ${practitionerLabel}.`);
    }

    const doctorIds = new Set();
    const doctorEmails = new Set();
    (config.doctors || []).forEach((doctor, index) => {
        if (!doctor.id) {
            errors.push(`${isVet ? 'Veterinarian' : 'Doctor'} row ${index + 1} is missing an ID.`);
        }
        if (!doctor.name) {
            errors.push(`${isVet ? 'Veterinarian' : 'Doctor'} row ${index + 1} is missing a name.`);
        }
        if (!doctor.email) {
            errors.push(`${isVet ? 'Veterinarian' : 'Doctor'} "${doctor.name || index + 1}" is missing an email.`);
        }
        if (doctor.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doctor.email)) {
            errors.push(`${isVet ? 'Veterinarian' : 'Doctor'} "${doctor.name || index + 1}" has an invalid email.`);
        }
        if (doctor.id && doctorIds.has(doctor.id.toLowerCase())) {
            errors.push(`${isVet ? 'Veterinarian' : 'Doctor'} ID "${doctor.id}" is duplicated.`);
        }
        if (doctor.email && doctorEmails.has(doctor.email.toLowerCase())) {
            errors.push(`${isVet ? 'Veterinarian' : 'Doctor'} email "${doctor.email}" is duplicated.`);
        }
        if (doctor.signatureDataUrl && !/^data:image\/(png|jpe?g);base64,/i.test(doctor.signatureDataUrl)) {
            errors.push(`${isVet ? 'Veterinarian' : 'Doctor'} "${doctor.name || index + 1}" has an invalid signature image. Use PNG or JPG.`);
        }
        if (doctor.id) {
            doctorIds.add(doctor.id.toLowerCase());
        }
        if (doctor.email) {
            doctorEmails.add(doctor.email.toLowerCase());
        }
    });

    const dosageTypesToCheck = isVet ? ['oil'] : ['oil', 'pills', 'gummies'];
    dosageTypesToCheck.forEach(type => {
        if (!config.dosageOptions || !config.dosageOptions[type] || !config.dosageOptions[type].length) {
            errors.push(`Add at least one ${type} dosage option.`);
        } else {
            config.dosageOptions[type].forEach((dosage, index) => {
                if (!dosage.value) {
                    errors.push(`${type} dosage row ${index + 1} must include dosage text.`);
                }
            });
        }
    });

    if (!config.instructionOptions || !config.instructionOptions.oil || !config.instructionOptions.oil.length) {
        errors.push('Add at least one oil instruction.');
    }
    if (!isVet) {
        if (!config.instructionOptions || !config.instructionOptions.other || !config.instructionOptions.other.length) {
            errors.push('Add at least one pill/gummy instruction.');
        }
    }

    if (!config.defaultNotes || !config.defaultNotes.base || !config.defaultNotes.base.length) {
        errors.push('Add at least one default additional instruction.');
    }

    if (!config.pdfText) {
        errors.push('PDF text settings cannot be empty.');
    } else {
        const requiredPdfKeys = isVet
            ? ['telehealthNotice', 'travelAdvisory', 'safetyAdvisory', 'patientAgreement', 'contactInformation']
            : ['telehealthNotice', 'travelAdvisory', 'safetyAdvisory', 'occupationalSafetyAdvisory', 'patientAgreement', 'contactInformation'];

        requiredPdfKeys.forEach(key => {
            const value = config.pdfText[key];
            if (!value) {
                errors.push(`The ${key} text cannot be empty.`);
            } else if (value.length > 1200) {
                errors.push(`The ${key} text is too long. Keep it under 1200 characters.`);
            }
        });
    }

    if (!config.footer || !config.footer.companyName || !config.footer.website) {
        errors.push('Footer must include at least company name and website.');
    }

    return errors;
}

function showAdminMessage(message, type = 'success') {
    const adminMessage = document.getElementById('adminMessage');
    if (!adminMessage) {
        return;
    }
    adminMessage.textContent = message;
    adminMessage.className = `admin-message ${type}`;
}

function clearAdminMessage() {
    const adminMessage = document.getElementById('adminMessage');
    if (!adminMessage) {
        return;
    }
    adminMessage.textContent = '';
    adminMessage.className = 'admin-message';
}

function formatAppConfigVersionDate(updatedAt) {
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) {
        return updatedAt || 'Unknown date';
    }

    return date.toLocaleString();
}

function setAdminVersionHistoryMessage(message, type = '') {
    const messageEl = document.getElementById('adminVersionHistoryMessage');
    if (!messageEl) {
        return;
    }

    messageEl.textContent = message;
    messageEl.className = type ? `admin-version-message ${type}` : 'admin-version-message';
}

function renderAdminVersionHistoryList(versions = []) {
    const list = document.getElementById('adminVersionHistoryList');
    if (!list) {
        return;
    }

    list.innerHTML = '';
    if (!versions.length) {
        const emptyState = document.createElement('div');
        emptyState.className = 'admin-version-empty';
        emptyState.textContent = `No saved ${isVetMode ? 'vet ' : ''}app config versions found yet.`;
        list.appendChild(emptyState);
        return;
    }

    versions.forEach((version, index) => {
        const row = document.createElement('div');
        row.className = 'admin-version-row';

        const details = document.createElement('div');
        details.className = 'admin-version-details';

        const title = document.createElement('strong');
        title.textContent = formatAppConfigVersionDate(version.updatedAt);
        details.appendChild(title);

        const meta = document.createElement('span');
        meta.textContent = index === 0 ? 'Latest version' : version.sheetTitle;
        details.appendChild(meta);

        const restoreButton = document.createElement('button');
        restoreButton.type = 'button';
        restoreButton.className = 'admin-version-restore-btn secondary';
        restoreButton.dataset.sheetTitle = version.sheetTitle;
        restoreButton.dataset.versionLabel = formatAppConfigVersionDate(version.updatedAt);
        restoreButton.textContent = index === 0 ? 'Restore Latest' : 'Restore';

        row.appendChild(details);
        row.appendChild(restoreButton);
        list.appendChild(row);
    });
}

function closeAdminVersionHistory() {
    const overlay = document.getElementById('adminVersionHistoryLightbox');
    if (!overlay) {
        return;
    }

    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
}

async function loadAdminVersionHistory() {
    if (typeof window.listAppConfigVersions !== 'function') {
        throw new Error('App config version history helper is unavailable.');
    }

    setAdminVersionHistoryMessage(`Loading ${isVetMode ? 'vet ' : ''}app config versions...`);
    renderAdminVersionHistoryList([]);
    const versions = await window.listAppConfigVersions({ isVet: isVetMode });
    setAdminVersionHistoryMessage(versions.length ? '' : `No ${isVetMode ? 'vet ' : ''}version history is available yet.`);
    renderAdminVersionHistoryList(versions);
}

async function openAdminVersionHistory() {
    const overlay = document.getElementById('adminVersionHistoryLightbox');
    const closeButton = document.getElementById('closeAdminVersionHistoryBtn');
    const titleEl = document.getElementById('adminVersionHistoryTitle');
    if (!overlay) {
        return;
    }

    if (titleEl) {
        titleEl.textContent = isVetMode ? 'Vet App Config Version History' : 'App Config Version History';
    }

    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    if (closeButton) {
        closeButton.focus();
    }

    try {
        await loadAdminVersionHistory();
    } catch (error) {
        console.error('Unable to load app config versions:', error);
        setAdminVersionHistoryMessage(`Could not load version history: ${error.message}`, 'error');
    }
}

async function restoreAdminConfigVersion(sheetTitle, versionLabel) {
    if (typeof window.getAppConfigVersionFromSheet !== 'function' || typeof window.restoreAppConfigVersion !== 'function') {
        throw new Error('App config restore helpers are unavailable.');
    }

    const version = await window.getAppConfigVersionFromSheet(sheetTitle, { isVet: isVetMode });
    const errors = validateAdminConfig(version.config, isVetMode);
    if (errors.length) {
        throw new Error(`Selected version cannot be restored: ${errors.join(' ')}`);
    }

    const result = await window.restoreAppConfigVersion(sheetTitle, { isVet: isVetMode });
    applyAppConfig(result.config, { source: 'google-sheet', updatedAt: result.updatedAt, isVet: isVetMode });
    setCachedConfig(appConfig, result.updatedAt, isVetMode);
    populateAdminForm();
    closeAdminVersionHistory();
    showAdminMessage(`Restored ${isVetMode ? 'vet ' : ''}app config from ${versionLabel}. A new latest version was created.`);
}

function updateAdminVisibility() {
    const adminModeBtn = document.getElementById('adminModeBtn');
    if (adminModeBtn) {
        adminModeBtn.style.display = currentUser && currentUser.isAdmin ? 'inline-block' : 'none';
    }
}

function updateAdminStatus() {
    const status = document.getElementById('configStatus');
    if (!status) {
        return;
    }

    const updatedText = appConfigMeta.updatedAt ? ` Last saved: ${new Date(appConfigMeta.updatedAt).toLocaleString()}.` : '';
    const sourceLabel = appConfigMeta.source === 'google-sheet'
        ? 'Google Sheets'
        : appConfigMeta.source === 'cache'
            ? 'cached settings'
            : 'default app settings';
    status.textContent = `Using ${isVetMode ? 'vet ' : ''}${sourceLabel}.${updatedText}`;
    status.style.display = currentUser && currentUser.isAdmin ? 'block' : 'none';
}

function setDoctorSelectionForCurrentUser() {
    const doctorSelect = document.getElementById('doctorSelect');
    if (!doctorSelect) {
        return;
    }

    if (!currentUser) {
        doctorSelect.disabled = false;
        return;
    }

    const matchedDoctor = getDoctorForEmail(currentUser.email);
    if (matchedDoctor) {
        doctorSelect.value = matchedDoctor.id;
        doctorSelect.disabled = true;
        return;
    }

    doctorSelect.disabled = !currentUser.isDoctor;
}

window.getDoctorDriveFolderId = getDoctorDriveFolderId;

function openAdminPanel() {
    if (!currentUser || !currentUser.isAdmin) {
        alert('Only authorized admin users can open admin mode.');
        return;
    }

    const adminModal = document.getElementById('adminModal');
    const adminPanel = document.getElementById('adminPanel');
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    if (!adminModal || !adminPanel) {
        return;
    }

    populateAdminForm();
    clearAdminMessage();
    adminPanel.scrollTop = 0;
    adminModal.classList.add('show');
    adminModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('admin-modal-open');
    if (closeAdminBtn) {
        closeAdminBtn.focus();
    }
}

function closeAdminPanel() {
    const adminModal = document.getElementById('adminModal');
    if (adminModal) {
        adminModal.classList.remove('show');
        adminModal.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('admin-modal-open');
}

// Handle Google Sign-In response
async function handleCredentialResponse(response) {
    // Decode the credential response
    const credential = parseJwt(response.credential);
    console.log("Decoded credential:", credential);

    // Convert to lowercase for case-insensitive comparison
    const email = credential.email.toLowerCase();

    const isAdmin = isEmailAllowed(email, ADMIN_EMAILS);
    const isVetRole = selectedLoginRole === 'vet';

    let isAuthorized = false;

    if (isVetRole) {
        isAuthorized = isEmailAllowed(email, getConfiguredVetEmails()) || isAdmin;
        if (!isAuthorized) {
            document.getElementById('loginMessage').textContent = 'Checking latest veterinarian access...';
            document.getElementById('loginMessage').className = 'login-message';
            await loadRemoteAppConfig({ silent: true, isVet: true });
            isAuthorized = isEmailAllowed(email, getConfiguredVetEmails()) || isAdmin;

            if (!isAuthorized) {
                await loadRemoteAppConfig({ silent: true, prompt: 'consent', isVet: true });
                isAuthorized = isEmailAllowed(email, getConfiguredVetEmails()) || isAdmin;
            }
        }
    } else {
        isAuthorized = isEmailAllowed(email, getConfiguredDoctorEmails()) || isAdmin;
        if (!isAuthorized) {
            document.getElementById('loginMessage').textContent = 'Checking latest doctor access...';
            document.getElementById('loginMessage').className = 'login-message';
            await loadRemoteAppConfig({ silent: true, isVet: false });
            isAuthorized = isEmailAllowed(email, getConfiguredDoctorEmails()) || isAdmin;

            if (!isAuthorized) {
                await loadRemoteAppConfig({ silent: true, prompt: 'consent', isVet: false });
                isAuthorized = isEmailAllowed(email, getConfiguredDoctorEmails()) || isAdmin;
            }
        }
    }

    if (isAuthorized) {
        // Valid login
        console.log(`Valid ${isVetRole ? 'veterinarian' : 'doctor'} login:`, email);
        isVetMode = isVetRole;
        window.isVetMode = isVetRole;
        currentUser = {
            email: email,
            name: credential.name,
            picture: credential.picture,
            isDoctor: true,
            isVet: isVetRole,
            isAdmin
        };

        if (isVetMode) {
            document.body.classList.add('vet-mode');
            loadCachedAppConfig(true);
        } else {
            document.body.classList.remove('vet-mode');
            loadCachedAppConfig(false);
        }

        resetForm();
        setDoctorSelectionForCurrentUser();

        // Display login success and show app
        document.getElementById('loginMessage').textContent = 'Login successful!';
        document.getElementById('loginMessage').className = 'login-message success';

        // Set user email in the header
        document.getElementById('userEmail').textContent = email;

        // Hide login overlay and show app after a short delay
        setTimeout(() => {
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            updateAdminVisibility();
            loadRemoteAppConfig({ silent: true, isVet: isVetRole });
        }, 1000);
    } else {
        // Invalid login
        console.log(`Invalid ${isVetRole ? 'veterinarian' : 'doctor'} login attempt:`, email);
        document.getElementById('loginMessage').textContent = isVetRole
            ? 'Access denied. Only authorized veterinarians can use this application.'
            : 'Access denied. Only authorized doctors can use this application.';
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
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

// Logout function
function logout() {
    // Clear user data
    currentUser = null;
    isVetMode = false;
    window.isVetMode = false;
    selectedLoginRole = 'doctor';
    document.body.classList.remove('vet-mode');
    loadCachedAppConfig(false);

    const roleSelection = document.getElementById('loginRoleSelection');
    const signInStep = document.getElementById('loginSignInStep');
    if (roleSelection) roleSelection.style.display = 'block';
    if (signInStep) signInStep.style.display = 'none';

    // Reset the doctor select
    document.getElementById('doctorSelect').value = '';
    document.getElementById('doctorSelect').disabled = false;

    // Show login overlay and hide app
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    closeAdminPanel();

    // Reset login message
    document.getElementById('loginMessage').textContent = '';
    document.getElementById('loginMessage').className = 'login-message';

    // Clear form if needed
    resetForm();
    updateAdminVisibility();

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
}

// Function to update dosage options - move this OUTSIDE the DOMContentLoaded listener
function updateDosageOptions(medicationSelect) {
    const medicationEntry = medicationSelect.parentElement.parentElement;
    const dosageSelect = medicationEntry.querySelector('.medication-dosage');
    const customMedInput = medicationEntry.querySelector('.custom-medication-input');
    const selectedMed = medicationSelect.value;

    // Show/hide custom medication input
    if (selectedMed === 'custom') {
        customMedInput.style.display = 'block';
        customMedInput.focus();
    } else {
        customMedInput.style.display = 'none';
        customMedInput.value = ''; // Clear custom input when switching away
    }

    // Clear existing options
    dosageSelect.innerHTML = '<option value="">Select Dosage</option>';

    getDosageOptionsForMedication(selectedMed).forEach(dosage => {
        const value = dosage.value;
        const option = new Option(value, value);
        dosageSelect.add(option);
    });

    // Add custom option
    const customOption = new Option('Custom dosage...', 'custom');
    dosageSelect.add(customOption);

    // Make sure the custom dosage textarea exists
    let customDosageTextarea = medicationEntry.querySelector('.custom-dosage');
    if (!customDosageTextarea) {
        customDosageTextarea = document.createElement('textarea');
        customDosageTextarea.className = 'custom-dosage';
        customDosageTextarea.placeholder = 'Enter custom dosage here...';
        customDosageTextarea.style.display = 'none';
        medicationEntry.querySelector('.form-group:nth-child(2)').appendChild(customDosageTextarea);

        // Add auto-resize listener
        customDosageTextarea.addEventListener('input', function () {
            autoResizeTextArea(this);
        });
    }

    // Add change listener to the dosage select
    dosageSelect.onchange = function () {
        if (this.value === 'custom') {
            customDosageTextarea.style.display = 'block';
            customDosageTextarea.focus();
        } else {
            customDosageTextarea.style.display = 'none';
        }
    };

    updateInstructionOptions(medicationSelect);
}

// Function to update instruction options - move this OUTSIDE the DOMContentLoaded listener
function updateInstructionOptions(medicationSelect) {
    const instructionsContainer = medicationSelect.parentElement.parentElement.querySelector('.instructions-container');
    const selectedMed = medicationSelect.value;

    // Clear existing options
    instructionsContainer.querySelector('.instructions-checklist').innerHTML = '';

    const instructions = getInstructionOptionsForMedication(selectedMed);

    const checklistDiv = instructionsContainer.querySelector('.instructions-checklist');
    instructions.forEach(instruction => {
        checklistDiv.appendChild(createCheckboxItem(instruction));
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
    if (isVetMode) {
        const noteConfig = (appConfig.defaultNotes && appConfig.defaultNotes.base) || [
            'Give only as directed. Do not exceed the prescribed dose.',
            'Do not combine with sedatives, sleeping pills, or painkillers.',
            'Store securely away from children and other pets.',
            "Inform your treating veterinarian about using CBD for your pet's medical condition.",
            'Limit to only one type of CBD product within a 24-hour period.',
            'Ensure fresh drinking water is available and let your pet rest after dosing.'
        ];
        return noteConfig.map(formatBulletNote).filter(Boolean).join('\n');
    }

    const noteConfig = appConfig.defaultNotes || {};
    const baseNotes = (noteConfig.base || []).map(formatBulletNote).filter(Boolean);

    // Add pregnancy note only for female patients
    if (gender.toLowerCase() === 'female' && noteConfig.female) {
        baseNotes.splice(3, 0, formatBulletNote(noteConfig.female));
    }

    const hasOils = medications.some(med => getMedicationType(med) === 'oil');

    const hasPillsOrGummies = medications.some(med => {
        const type = getMedicationType(med);
        return type === 'pills' || type === 'gummies';
    });

    // Add conditional rest instructions
    if (hasOils) {
        (noteConfig.oil || []).forEach(note => {
            const formatted = formatBulletNote(note);
            if (formatted) baseNotes.push(formatted);
        });
    }

    if (hasPillsOrGummies) {
        (noteConfig.pillsOrGummies || []).forEach(note => {
            const formatted = formatBulletNote(note);
            if (formatted) baseNotes.push(formatted);
        });
    }

    return baseNotes.join('\n');
}

function formatBulletNote(note) {
    const trimmed = String(note || '').trim();
    if (!trimmed) {
        return '';
    }
    return trimmed.startsWith('•') ? trimmed : `• ${trimmed}`;
}

function isCurrentNotesDefault(currentNotes) {
    if (!currentNotes || !currentNotes.trim()) {
        return false;
    }

    const cleanText = currentNotes.replace(/^[•\s\-\*]+/gm, '').toLowerCase();

    // Human default anchors
    const humanAnchors = [
        'do not combine with alcohol',
        'store securely away from children',
        'inform your treating physician',
        'follow sleep hygiene',
        'limit yourself to only one type of cbd product',
        'maintain age-appropriate healthy nutrition'
    ];

    // Vet default anchors
    const vetAnchors = [
        'give only as directed',
        'do not combine with sedatives',
        'store securely away from children and other pets',
        'treating veterinarian',
        'limit to only one type of cbd product',
        'fresh drinking water is available'
    ];

    const humanMatchCount = humanAnchors.filter(anchor => cleanText.includes(anchor)).length;
    const vetMatchCount = vetAnchors.filter(anchor => cleanText.includes(anchor)).length;
    if (humanMatchCount >= 2 || vetMatchCount >= 2) {
        return true;
    }

    if (appConfig && appConfig.defaultNotes && Array.isArray(appConfig.defaultNotes.base) && appConfig.defaultNotes.base.length > 0) {
        const activeAnchors = appConfig.defaultNotes.base
            .map(n => String(n || '').replace(/^[•\s\-\*]+/, '').trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 3);
        const activeMatchCount = activeAnchors.filter(anchor => anchor && cleanText.includes(anchor)).length;
        if (activeMatchCount >= Math.min(2, activeAnchors.length)) {
            return true;
        }
    }

    return false;
}

function updateNotesIfDefault(force = false) {
    const notesTextarea = document.getElementById('notes');
    if (!notesTextarea) {
        return;
    }

    const currentNotes = notesTextarea.value;
    const gender = document.getElementById('patientGender') ? document.getElementById('patientGender').value : '';
    const medicationSelects = document.querySelectorAll('.medication-name');
    const selectedMeds = Array.from(medicationSelects)
        .map(select => select.value)
        .filter(value => value);

    if (force || !currentNotes.trim() || isCurrentNotesDefault(currentNotes)) {
        notesTextarea.value = getDefaultNotes(gender, selectedMeds);
        autoResizeTextArea(notesTextarea);
    }
}

// Add this function outside the DOMContentLoaded listener
function resetForm() {
    // Reset doctor selection - but only if no user is logged in
    if (!currentUser) {
        document.getElementById('doctorSelect').value = '';
        document.getElementById('doctorSelect').disabled = false;
    } else {
        // If user is logged in, keep their configured doctor selection.
        setDoctorSelectionForCurrentUser();
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
    updateNotesIfDefault(true);

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

        // Reset custom medication input if it exists
        const customMedInput = firstEntry.querySelector('.custom-medication-input');
        if (customMedInput) {
            customMedInput.value = '';
            customMedInput.style.display = 'none';
        }

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
    updateNotesIfDefault();
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

// Success lightbox helpers
let lastUploadedPdfUrl = '';

function showSuccessLightbox(pdfUrl) {
    lastUploadedPdfUrl = pdfUrl || '';
    const overlay = document.getElementById('successLightbox');
    const linkPreview = document.getElementById('linkPreview');
    const copyBtn = document.getElementById('copyLinkBtn');
    const driveInfo = window.lastDriveUploadInfo || null;
    const folderUrl = driveInfo && driveInfo.folderUrl ? driveInfo.folderUrl : '';

    if (linkPreview) {
        if (lastUploadedPdfUrl) {
            linkPreview.textContent = lastUploadedPdfUrl;
        } else if (folderUrl) {
            linkPreview.textContent = `Uploaded to Drive, but link couldn't be fetched. Open folder: ${folderUrl}`;
        } else {
            linkPreview.textContent = 'Uploaded to Drive, but link could not be fetched.';
        }
    }
    if (copyBtn) {
        if (lastUploadedPdfUrl) {
            copyBtn.textContent = 'Copy prescription link';
            copyBtn.disabled = false;
        } else if (folderUrl) {
            copyBtn.textContent = 'Open Drive folder';
            copyBtn.disabled = false;
        } else {
            copyBtn.textContent = 'Close';
            copyBtn.disabled = false;
        }
    }
    if (overlay) {
        overlay.classList.add('show');
    }
}

function hideSuccessLightbox() {
    const overlay = document.getElementById('successLightbox');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

async function copyPrescriptionLink() {
    const copyBtn = document.getElementById('copyLinkBtn');
    try {
        // If we don't have a file link, fall back to opening the Drive folder.
        if (!lastUploadedPdfUrl) {
            const driveInfo = window.lastDriveUploadInfo || null;
            const folderUrl = driveInfo && driveInfo.folderUrl ? driveInfo.folderUrl : '';
            if (folderUrl) {
                window.open(folderUrl, '_blank', 'noopener,noreferrer');
            }
            return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(lastUploadedPdfUrl);
        } else {
            const ta = document.createElement('textarea');
            ta.value = lastUploadedPdfUrl;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        if (copyBtn) {
            const original = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.disabled = true;
            setTimeout(() => {
                copyBtn.textContent = original;
                copyBtn.disabled = false;
            }, 1500);
        }
    } catch (e) {
        console.error('Failed to copy link', e);
        if (copyBtn) {
            copyBtn.textContent = 'Copy failed';
        }
    }
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
    loadCachedAppConfig();
    renderConfigDrivenFields();

    // Initialize Google authentication
    window.onload = function () {
        initializeGoogleAuth();
    };

    // Scroll to Top Button functionality
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');

    // Show/hide scroll to top button based on scroll position
    window.addEventListener('scroll', function () {
        if (window.pageYOffset > 300) {
            scrollToTopBtn.classList.add('show');
        } else {
            scrollToTopBtn.classList.remove('show');
        }
    });

    // Scroll to top when button is clicked
    scrollToTopBtn.addEventListener('click', function () {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Initialize height converter
    setupHeightConverter();

    // Wire success lightbox buttons
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');
    const successOverlay = document.getElementById('successLightbox');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', copyPrescriptionLink);
    }
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', hideSuccessLightbox);
    }
    if (successOverlay) {
        successOverlay.addEventListener('click', function (e) {
            if (e.target === successOverlay) {
                hideSuccessLightbox();
            }
        });
    }

    // Wire login role selection buttons
    const doctorLoginBtn = document.getElementById('doctorLoginBtn');
    const vetLoginBtn = document.getElementById('vetLoginBtn');
    const loginBackBtn = document.getElementById('loginBackBtn');
    const loginRoleSelection = document.getElementById('loginRoleSelection');
    const loginSignInStep = document.getElementById('loginSignInStep');
    const loginTitle = document.getElementById('loginTitle');
    const loginSubtitle = document.getElementById('loginSubtitle');

    if (doctorLoginBtn) {
        doctorLoginBtn.addEventListener('click', () => {
            selectedLoginRole = 'doctor';
            isVetMode = false;
            window.isVetMode = false;
            document.body.classList.remove('vet-mode');
            loadCachedAppConfig(false);
            resetForm();
            if (loginTitle) loginTitle.textContent = 'Doctor Login';
            if (loginSubtitle) loginSubtitle.textContent = 'Please sign in with your Qurist doctor account to continue';
            if (loginRoleSelection) loginRoleSelection.style.display = 'none';
            if (loginSignInStep) loginSignInStep.style.display = 'block';
            if (window.google && google.accounts && google.accounts.id) {
                google.accounts.id.prompt();
            }
        });
    }

    if (vetLoginBtn) {
        vetLoginBtn.addEventListener('click', () => {
            selectedLoginRole = 'vet';
            isVetMode = true;
            window.isVetMode = true;
            document.body.classList.add('vet-mode');
            loadCachedAppConfig(true);
            resetForm();
            if (loginTitle) loginTitle.textContent = 'Veterinarian Login';
            if (loginSubtitle) loginSubtitle.textContent = 'Please sign in with your Qurist veterinarian account to continue';
            if (loginRoleSelection) loginRoleSelection.style.display = 'none';
            if (loginSignInStep) loginSignInStep.style.display = 'block';
            if (window.google && google.accounts && google.accounts.id) {
                google.accounts.id.prompt();
            }
        });
    }

    if (loginBackBtn) {
        loginBackBtn.addEventListener('click', () => {
            if (loginSignInStep) loginSignInStep.style.display = 'none';
            if (loginRoleSelection) loginRoleSelection.style.display = 'block';
            const msg = document.getElementById('loginMessage');
            if (msg) {
                msg.textContent = '';
                msg.className = 'login-message';
            }
        });
    }

    // Add event listener for logout button
    document.getElementById('logoutBtn').addEventListener('click', function () {
        logout();
    });

    const adminModeBtn = document.getElementById('adminModeBtn');
    const adminModal = document.getElementById('adminModal');
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    const closeAdminFooterBtn = document.getElementById('closeAdminFooterBtn');
    const versionHistoryBtn = document.getElementById('versionHistoryBtn');
    const versionHistoryOverlay = document.getElementById('adminVersionHistoryLightbox');
    const closeVersionHistoryBtn = document.getElementById('closeAdminVersionHistoryBtn');
    const versionHistoryList = document.getElementById('adminVersionHistoryList');
    const saveAdminConfigBtn = document.getElementById('saveAdminConfigBtn');

    if (adminModeBtn) {
        adminModeBtn.addEventListener('click', openAdminPanel);
    }
    if (closeAdminBtn) {
        closeAdminBtn.addEventListener('click', closeAdminPanel);
    }
    if (closeAdminFooterBtn) {
        closeAdminFooterBtn.addEventListener('click', closeAdminPanel);
    }
    if (adminModal) {
        adminModal.addEventListener('click', function (event) {
            if (event.target === adminModal) {
                closeAdminPanel();
            }
        });
    }
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            const confirmOverlay = document.getElementById('adminRemoveConfirmLightbox');
            if (confirmOverlay && confirmOverlay.classList.contains('show')) {
                return;
            }
            if (versionHistoryOverlay && versionHistoryOverlay.classList.contains('show')) {
                closeAdminVersionHistory();
                return;
            }
            closeAdminPanel();
        }
    });
    if (versionHistoryBtn) {
        versionHistoryBtn.addEventListener('click', openAdminVersionHistory);
    }
    if (closeVersionHistoryBtn) {
        closeVersionHistoryBtn.addEventListener('click', closeAdminVersionHistory);
    }
    if (versionHistoryOverlay) {
        versionHistoryOverlay.addEventListener('click', function (event) {
            if (event.target === versionHistoryOverlay) {
                closeAdminVersionHistory();
            }
        });
    }
    if (versionHistoryList) {
        versionHistoryList.addEventListener('click', async function (event) {
            const restoreButton = event.target.closest('.admin-version-restore-btn');
            if (!restoreButton) {
                return;
            }

            const sheetTitle = restoreButton.dataset.sheetTitle;
            const versionLabel = restoreButton.dataset.versionLabel || 'the selected version';
            const confirmed = await confirmAdminAction(
                `Restore ${isVetMode ? 'vet ' : ''}app config from ${versionLabel}? This will immediately publish it as the latest version.`,
                {
                    title: 'Confirm restore',
                    confirmLabel: 'Restore'
                }
            );
            if (!confirmed) {
                return;
            }

            const originalText = restoreButton.textContent;
            restoreButton.disabled = true;
            restoreButton.textContent = 'Restoring...';
            setAdminVersionHistoryMessage(`Restoring selected ${isVetMode ? 'vet ' : ''}app config version...`);
            try {
                await restoreAdminConfigVersion(sheetTitle, versionLabel);
            } catch (error) {
                console.error('Unable to restore app config version:', error);
                setAdminVersionHistoryMessage(`Could not restore version: ${error.message}`, 'error');
            } finally {
                restoreButton.textContent = originalText;
                restoreButton.disabled = false;
            }
        });
    }
    if (saveAdminConfigBtn) {
        saveAdminConfigBtn.addEventListener('click', async function () {
            clearAdminMessage();
            const nextConfig = buildConfigFromAdminForm();
            const errors = validateAdminConfig(nextConfig, isVetMode);
            if (errors.length) {
                showAdminMessage(errors.join(' '), 'error');
                return;
            }

            const originalText = this.textContent;
            this.disabled = true;
            this.textContent = 'Saving...';
            try {
                if (typeof window.saveAppConfigToSheet !== 'function') {
                    throw new Error('App config save helper is unavailable.');
                }
                const result = await window.saveAppConfigToSheet(nextConfig, { isVet: isVetMode });
                applyAppConfig(nextConfig, { source: 'google-sheet', updatedAt: result.updatedAt, isVet: isVetMode });
                setCachedConfig(appConfig, result.updatedAt, isVetMode);
                populateAdminForm();
                showAdminMessage(`${isVetMode ? 'Veterinarian' : 'Doctor'} admin settings saved successfully.`);
            } catch (error) {
                console.error('Unable to save admin settings:', error);
                showAdminMessage(`Could not save admin settings: ${error.message}`, 'error');
            } finally {
                this.textContent = originalText;
                this.disabled = false;
            }
        });
    }
    initializeAdminOptionEditors();
    updateAdminVisibility();
    updateAdminStatus();

    // Check authentication before allowing certain actions
    const checkAuth = function (event, action) {
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
    document.getElementById('followUpType').addEventListener('change', function () {
        const customDateField = document.getElementById('customFollowUpDate');
        if (this.value === 'custom') {
            customDateField.style.display = 'block';
            customDateField.focus();
        } else {
            customDateField.style.display = 'none';
        }
    });

    const complaintsChecklistDiv = document.querySelector('.complaints-checklist');
    // Add event listener for complaints checkboxes
    complaintsChecklistDiv.addEventListener('change', function (e) {
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
    document.getElementById('patientGender').addEventListener('change', function () {
        updateNotesBasedOnMedications();
    });

    // Add event listener to the "Add Another Medication" button
    document.getElementById('addMedicationBtn').addEventListener('click', function () {
        medicationCounter++;

        // Create a new medication entry
        const medicationEntry = document.createElement('div');
        medicationEntry.className = 'medication-entry';
        medicationEntry.innerHTML = `
            <div class="form-group">
                <label for="medication${medicationCounter}">Medication:</label>
                <select id="medication${medicationCounter}" class="medication-name" required onchange="updateDosageOptions(this)">
                    <option value="">Select Medication</option>
                </select>
                <input type="text" class="custom-medication-input" placeholder="Enter custom medication name..." style="display: none;">
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
        renderMedicationOptions(medicationEntry.querySelector('.medication-name'));

        // Add event listener to the remove button
        medicationEntry.querySelector('.remove-medication-btn').addEventListener('click', function () {
            medicationEntry.remove();
        });

        // Add event listener for checkboxes
        medicationEntry.querySelector('.instructions-checklist').addEventListener('change', function (e) {
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
            textarea.addEventListener('input', function () {
                autoResizeTextArea(this);
            });
        });

        // After adding a new medication, we need to add the change listener to its select
        medicationEntry.querySelector('.medication-name').addEventListener('change', function () {
            updateNotesBasedOnMedications();
        });
    });

    // Add event listener to the "Generate Prescription" button
    document.getElementById('generatePdfBtn').addEventListener('click', function (event) {
        // Check if user is authenticated
        if (!currentUser || !currentUser.isDoctor) {
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
    document.getElementById('saveToSheetsBtn').addEventListener('click', async function (event) {
        // Check if user is authenticated
        if (!currentUser || !currentUser.isDoctor) {
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
            const selectedDoctor = getDoctorConfig(document.getElementById('doctorSelect').value) || {};
            const prescriptionData = {
                date: document.getElementById('date').value,
                doctorName: selectedDoctor.name || '',
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
                followUp: '',
                isVet: isVetMode
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
                const medicationSelect = entry.querySelector('.medication-name');
                const medicationName = medicationSelect.value;

                // Handle custom medication name
                let displayName;
                if (medicationName === 'custom') {
                    const customMedInput = entry.querySelector('.custom-medication-input');
                    displayName = customMedInput && customMedInput.value ? customMedInput.value : 'Custom medication';
                } else {
                    displayName = medicationName;
                }

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
                    name: displayName,
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
            // If the session was idle for a while, force a new token request
            // Force token refresh (sheets.js keeps `accessToken` in a lexical scope, not `window.accessToken`)
            if (typeof window.clearGoogleAccessToken === 'function') {
                window.clearGoogleAccessToken();
            } else {
                window.accessToken = null;
            }
            await window.getAccessToken({ prompt: 'consent' });

            // Upload the PDF to Google Drive (required).
            // If link fetch fails, `uploadPdfToDrive()` returns an empty string but the upload is still successful.
            updateLoadingMessage('Uploading PDF to Google Drive...');
            const pdfUrl = await uploadPdfToDrive(pdfBlob, fileName, doctorSelect);
            if (!pdfUrl) {
                const driveInfo = window.lastDriveUploadInfo || null;
                const folderUrl = driveInfo && driveInfo.folderUrl ? driveInfo.folderUrl : '';
                const extra = folderUrl ? `\n\nOpen Drive folder to find it:\n${folderUrl}` : '';
                alert(`PDF uploaded to Drive, but the share link could not be fetched in the browser.${extra}\n\nThe sheet row will be saved without the PDF link.`);
            }

            // Save data to Google Sheets (always attempt)
            if (!pdfUrl) {
                updateLoadingMessage('Saving prescription data to Google Sheets...');
            } else {
                updateLoadingMessage('Saving prescription data to Google Sheets (with PDF link)...');
            }
            await savePrescriptionToSheet(prescriptionData, pdfUrl, 0, 3, 1000, { isVet: isVetMode });

            // Final confirmation message
            updateLoadingMessage('Finalizing...');
            setTimeout(() => {
                // Hide the loading overlay after a short delay to ensure the user sees the success message
                hideLoadingOverlay();
                showSuccessLightbox(pdfUrl);
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
        if (!currentUser || !currentUser.isDoctor) {
            alert('You must be logged in as an authorized doctor to generate prescriptions.');
            return null;
        }

        // Get form data - automatically use authenticated doctor
        const doctorSelect = document.getElementById('doctorSelect').value;

        const selectedDoctor = getDoctorConfig(doctorSelect) || {};

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
            const medicationSelect = entry.querySelector('.medication-name');
            const selectedName = medicationSelect.value;

            // Handle custom medication name
            let displayName;
            if (selectedName === 'custom') {
                const customMedInput = entry.querySelector('.custom-medication-input');
                displayName = customMedInput && customMedInput.value ? customMedInput.value : 'Custom medication';
            } else {
                const medicationConfig = getMedicationConfig(selectedName);
                displayName = medicationConfig && medicationConfig.pdfName ? medicationConfig.pdfName : selectedName;
            }

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

        const patientTableBody = isVetMode ? [
            [
                { content: "Name:", styles: { fontStyle: 'bold', textColor: [2, 113, 128] } },
                patientName,
                { content: "Age:", styles: { fontStyle: 'bold', textColor: [2, 113, 128] } },
                patientAge,
                { content: "Sex:", styles: { fontStyle: 'bold', textColor: [2, 113, 128] } },
                patientGender
            ],
            [
                { content: "Weight:", styles: { fontStyle: 'bold', textColor: [2, 113, 128] } },
                patientWeight ? `${patientWeight} kg` : "",
                "",
                "",
                "",
                ""
            ]
        ] : [
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
        ];

        doc.autoTable({
            body: patientTableBody,
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
            willDrawPage: function (data) {
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

            // Prefer the admin-configured signature stored in Google Sheets.
            if (selectedDoctor.signatureDataUrl) {
                doc.addImage(
                    selectedDoctor.signatureDataUrl,
                    getImageFormatFromDataUrl(selectedDoctor.signatureDataUrl),
                    150,
                    finalY - 15,
                    15,
                    8
                );
            } else {
                const signatureImg = document.getElementById(
                    doctorSelect === 'dr_rachna' ? 'rachnaSignature' : doctorSelect === 'dr_parul' ? 'parulSignature' : 'rohitSignature'
                );

                if (signatureImg && signatureImg.complete && signatureImg.naturalHeight !== 0) {
                    const signWidth = 15;
                    const signHeight = (signWidth * signatureImg.naturalHeight) / signatureImg.naturalWidth;
                    doc.addImage(signatureImg, 'PNG', 150, finalY - 15, signWidth, signHeight);
                }
            }

            // Add seal to the right of signature
            drawDoctorSeal(doc, 185, finalY - 10, selectedDoctor);

            doc.line(140, finalY, 190, finalY);
            doc.text(isVetMode ? "Veterinarian's Signature" : "Doctor's Signature", 165, finalY + 5, { align: 'center' });
        }

        // Add new sections for telehealth notice, travel disclaimer, and disclaimer
        // Check if we need a new page based on available space
        const additionalSectionsHeight = 125; // Approximate height needed for all additional sections including follow-up and contact information
        if (finalY + additionalSectionsHeight > doc.internal.pageSize.height - 20) {
            doc.addPage();
            finalY = 20;
        }

        // Add follow-up section
        const SECTION_GAP = 10;
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
        finalY += 7 + 5 + SECTION_GAP;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text('Telehealth Notice:', 20, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        const telehealthNotice = (isVetMode && appConfig.pdfText && appConfig.pdfText.telehealthNotice)
            ? appConfig.pdfText.telehealthNotice
            : (appConfig.pdfText.telehealthNotice || '');
        const splitTelehealthNotice = doc.splitTextToSize(telehealthNotice, 170);
        doc.text(splitTelehealthNotice, 20, finalY + 7);

        // Add travel disclaimer
        finalY += 7 + (splitTelehealthNotice.length * 5) + SECTION_GAP;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text('Travel Advisory:', 20, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        const travelDisclaimer = appConfig.pdfText.travelAdvisory || '';
        const splitTravelDisclaimer = doc.splitTextToSize(travelDisclaimer, 170);
        doc.text(splitTravelDisclaimer, 20, finalY + 7);

        // Update finalY after travel disclaimer
        finalY += 7 + (splitTravelDisclaimer.length * 5) + SECTION_GAP;

        // Add final safety advisory
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text('Safety Advisory', 20, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        const finalSafetyAdvisory = appConfig.pdfText.safetyAdvisory || '';
        const splitFinalSafetyAdvisory = doc.splitTextToSize(finalSafetyAdvisory, 170);
        doc.text(splitFinalSafetyAdvisory, 20, finalY + 7);

        // Update finalY after final safety advisory
        finalY += 7 + (splitFinalSafetyAdvisory.length * 5) + SECTION_GAP;

        // Add occupational safety advisory (omitted in pet mode)
        const safetyDisclaimer = appConfig.pdfText.occupationalSafetyAdvisory || '';
        if (!isVetMode && safetyDisclaimer) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(2, 113, 128);
            doc.text('Occupational Safety Advisory:', 20, finalY);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0);
            const splitSafetyDisclaimer = doc.splitTextToSize(safetyDisclaimer, 170);
            doc.text(splitSafetyDisclaimer, 20, finalY + 7);

            // Update finalY after safety advisory
            finalY += 7 + (splitSafetyDisclaimer.length * 5) + SECTION_GAP;
        }

        // Add Important Patient Agreement and Disclaimer
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text('Important Patient Agreement and Disclaimer:', 20, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        const patientAgreement = appConfig.pdfText.patientAgreement || '';
        const splitPatientAgreement = doc.splitTextToSize(patientAgreement, 170);
        doc.text(splitPatientAgreement, 20, finalY + 7);

        // Update finalY after disclaimer before adding contact information
        finalY += 7 + (splitPatientAgreement.length * 5) + SECTION_GAP;

        // Add Contact Information section
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 113, 128);
        doc.text('Contact Information:', 20, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        const contactInformation = appConfig.pdfText.contactInformation || '';
        const splitContactInformation = doc.splitTextToSize(contactInformation, 170);
        doc.text(splitContactInformation, 20, finalY + 7);

        finalY += 7 + (splitContactInformation.length * 5) + SECTION_GAP;

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
            subject: isVetMode ? 'Veterinary Prescription' : 'Medical Prescription',
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
    document.querySelector('.instructions-checklist').addEventListener('change', function (e) {
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
        textarea.addEventListener('input', function () {
            autoResizeTextArea(this);
        });
        // Initial resize
        autoResizeTextArea(textarea);
    });

    // Add event listener for the Clear Form button
    document.getElementById('clearFormBtn').addEventListener('click', function () {
        resetForm();
        // Scroll to top after clearing form
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Add delegation for medication changes
    document.getElementById('medicationsContainer').addEventListener('change', function (e) {
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
    ctx.fillText(isVetMode ? 'Certified Veterinary Practitioner' : 'Certified Medical Practitioner', 0, 0);
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

    const footerConfig = appConfig.footer || {};

    // Add company name
    doc.text(footerConfig.companyName || '', doc.internal.pageSize.width / 2, adjustedY, { align: 'center' });

    // Add CIN number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(footerConfig.cin || '', doc.internal.pageSize.width / 2, adjustedY + 5, { align: 'center' });

    // Add social media and website links with images
    const websiteText = footerConfig.website || '';
    const instagramText = footerConfig.instagram || '';
    const facebookText = footerConfig.facebook || '';

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

        // No special handling needed for single digit inches
        // We want 5.7 to be treated as 5 feet 7 inches

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

        // If the height starts with 1, treat it as centimeters automatically.
        if (value.startsWith('1') && heightUnit.value !== 'cm') {
            heightUnit.value = 'cm';
        }

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
