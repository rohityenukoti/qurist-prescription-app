// Safe defaults for admin-editable app content.
// The app always starts from this config and then merges any saved Google Sheets config over it.
(function () {
    const defaultAppConfig = {
        version: 1,
        complaints: [
            'Anxiety',
            'Insomnia',
            'Pain',
            'Fatigue',
            'Muscle Soreness',
            'Overthinking',
            'Menstrual Pain',
            'Migraine'
        ],
        medications: [
            {
                id: 'CBD mild',
                label: 'CBD mild',
                pdfName: 'Qurist Wide Spectrum Mild Potency Oil',
                type: 'oil'
            },
            {
                id: 'CBD medium',
                label: 'CBD medium',
                pdfName: 'Qurist Wide Spectrum Medium Potency Oil',
                type: 'oil'
            },
            {
                id: 'CBD strong',
                label: 'CBD strong',
                pdfName: 'Qurist Wide Spectrum Strong Potency Oil',
                type: 'oil'
            },
            {
                id: 'CBD + THC mild',
                label: 'CBD + THC mild',
                pdfName: 'Qurist Full Spectrum Mild Potency Oil',
                type: 'oil'
            },
            {
                id: 'CBD + THC medium',
                label: 'CBD + THC medium',
                pdfName: 'Qurist Full Spectrum Medium Potency Oil',
                type: 'oil'
            },
            {
                id: 'CBD + THC strong',
                label: 'CBD + THC strong',
                pdfName: 'Qurist Full Spectrum Strong Potency Oil',
                type: 'oil'
            },
            {
                id: 'Painaway Pills',
                label: 'Painaway Pills',
                pdfName: 'Qurist Painaway Pills',
                type: 'pills'
            },
            {
                id: 'Periodaid Pills',
                label: 'Periodaid Pills',
                pdfName: 'Qurist Periodaid Pills',
                type: 'pills'
            },
            {
                id: 'Sleepeasy Gummies',
                label: 'Sleepeasy Gummies',
                pdfName: 'Qurist Sleepeasy Gummies',
                type: 'gummies'
            }
        ],
        dosageOptions: {
            oil: [
                { value: '0.25ml (1/4 ml)' },
                { value: '0.5ml (1/2 ml)' },
                { value: '0.75ml (3/4 ml)' },
                { value: '1ml' }
            ],
            pills: [
                { value: '1 capsule' }
            ],
            gummies: [
                { value: '1/4 gummy' },
                { value: '1/2 gummy' },
                { value: '1 gummy' }
            ],
            other: []
        },
        instructionOptions: {
            oil: [
                'Sublingually -- 30 minutes before bedtime -- After Dinner',
                'Sublingually -- After Breakfast',
                'Sublingually -- After Lunch',
                'Sublingually -- As and When Required (SOS) -- After Meals',
                'External Application -- As and When Required (SOS)'
            ],
            other: [
                '30 minutes before bedtime -- After Dinner',
                'After Breakfast',
                'After Lunch',
                'As and When Required (SOS) -- After Meals'
            ]
        },
        defaultNotes: {
            base: [
                'Do not combine with alcohol, sleeping pills, or painkillers.',
                'Store securely away from children.',
                'Inform your treating physician about using CBD for your medical condition.',
                'Follow sleep hygiene measures as discussed.',
                'Maintain age-appropriate healthy nutrition and physical activity as discussed for your medical condition.',
                'Limit yourself to only one type of CBD product within a 24-hour period.'
            ],
            female: 'Not recommended during pregnancy or breastfeeding or planning to conceive.',
            oil: [
                'Rest for 6 hours after consuming CBD oils.',
                'If relief is insufficient, dosage may be gradually increased by 0.25ml increments up to a maximum of 1ml per day.'
            ],
            pillsOrGummies: [
                'Rest and hydrate well the day after consuming CBD pills or gummies.'
            ]
        },
        pdfText: {
            telehealthNotice: 'This prescription is generated on tele-consultation (no physical contact with patient).',
            travelAdvisory: 'For domestic travel within India: Please carry this prescription with you when traveling with Qurist products. International travel advisory: Qurist products contain CBD and THC. Check laws and regulations of all points in your journey. Approved for use in India. Kindly ensure compliance with local regulations when abroad.',
            safetyAdvisory: 'In case of accidental ingestion by a child or pet, seek immediate medical or veterinary attention and carry the product label.',
            occupationalSafetyAdvisory: 'CBD products may cause drowsiness. Avoid safety-sensitive tasks while using them. Confirm fitness for duty with your employer or relevant authority. Occupational suitability is assessed outside the prescribing physician’s scope.',
            patientAgreement: 'This prescription is solely for therapeutic purposes and should not be used for medico-legal purposes.',
            contactInformation: 'For any further queries, please contact: +91 8448298093'
        },
        doctors: [
            {
                id: 'dr_rohit',
                name: 'Dr. Rohit Yenukoti',
                designation: 'MBBS',
                regNo: '134654',
                email: 'rohit@qurist.in',
                driveFolderId: '12FVNhVQmwUF_6iw7Ky3JcCRdfc7-Hn9P',
                signatureDataUrl: ''
            },
            {
                id: 'dr_rachna',
                name: 'Dr. Rachna Chandra',
                designation: 'MBBS, MD',
                regNo: 'DMC/R/2261',
                email: 'rachna@qurist.in',
                driveFolderId: '1Kv8U6FbGX4equiElhVB5ydZpgcXGZeFM',
                signatureDataUrl: ''
            },
            {
                id: 'dr_parul',
                name: 'Dr. Parul',
                designation: 'BAMS',
                regNo: 'DBCP/A/7986',
                email: 'drparul@qurist.in',
                driveFolderId: '1uPj2gdGEOMuFNHdVatYPjrjKniId5TG5',
                signatureDataUrl: ''
            },
            {
                id: 'dr_mrinal',
                name: 'Dr. Mrinal Singh',
                designation: 'MBBS',
                regNo: 'DMC/R/29653',
                email: 'dr.mrinal@qurist.in',
                driveFolderId: '1w1lgcR2LQ4WI-kSEp1WnoFpobV6BS2E9',
                signatureDataUrl: ''
            }
        ],
        footer: {
            companyName: 'Hemp Health Pvt. Ltd.',
            cin: 'CIN No. U2423 | HR2020PTC087774',
            website: 'www.qurist.in',
            instagram: '@quristcbd',
            facebook: '@quristcbd'
        }
    };

    function deepClone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function mergeConfig(defaults, overrides) {
        if (!overrides || typeof overrides !== 'object') {
            return deepClone(defaults);
        }

        const merged = Array.isArray(defaults) ? [] : {};
        Object.keys(defaults).forEach(key => {
            const defaultValue = defaults[key];
            const overrideValue = overrides[key];

            if (Array.isArray(defaultValue)) {
                merged[key] = Array.isArray(overrideValue) ? deepClone(overrideValue) : deepClone(defaultValue);
            } else if (defaultValue && typeof defaultValue === 'object') {
                merged[key] = mergeConfig(defaultValue, overrideValue);
            } else {
                merged[key] = overrideValue !== undefined ? overrideValue : defaultValue;
            }
        });

        return merged;
    }

    // Vet-mode default configuration for pet prescriptions.
    const defaultVetConfig = {
        version: 1,
        complaints: [
            'Anxiety / Stress',
            'Pain / Inflammation',
            'Arthritis / Joint Pain',
            'Seizures / Epilepsy',
            'Aggression / Behavioral Issues',
            'Appetite Loss / Nausea',
            'Sleep Issues / Restlessness',
            'Skin Allergies / Itching'
        ],
        medications: [
            {
                id: 'Dog CBD Oil Small',
                label: 'Dog CBD Oil Small',
                pdfName: 'Dog CBD Oil Small',
                type: 'oil'
            },
            {
                id: 'Dog CBD Oil Medium',
                label: 'Dog CBD Oil Medium',
                pdfName: 'Dog CBD Oil Medium',
                type: 'oil'
            },
            {
                id: 'Dog CBD Oil Large',
                label: 'Dog CBD Oil Large',
                pdfName: 'Dog CBD Oil Large',
                type: 'oil'
            },
            {
                id: 'Cat CBD Oil Small',
                label: 'Cat CBD Oil Small',
                pdfName: 'Cat CBD Oil Small',
                type: 'oil'
            },
            {
                id: 'Cat CBD Oil Medium',
                label: 'Cat CBD Oil Medium',
                pdfName: 'Cat CBD Oil Medium',
                type: 'oil'
            }
        ],
        dosageOptions: {
            oil: [
                { value: '0.25 ml' },
                { value: '0.5 ml' },
                { value: '0.75 ml' },
                { value: '1 ml' }
            ],
            pills: [],
            gummies: [],
            other: []
        },
        instructionOptions: {
            oil: [
                'Orally / with food -- Twice daily',
                'Orally / with food -- Once daily in morning',
                'Orally / with food -- Once daily at night',
                'Orally / with food -- As and When Required (SOS)',
                'Mixed with food or treats -- Twice daily',
                'External Application -- As and When Required (SOS)'
            ],
            other: [
                'Orally / with food -- Twice daily',
                'Orally / with food -- Once daily in morning',
                'Orally / with food -- Once daily at night'
            ]
        },
        defaultNotes: {
            base: [
                'Give only as directed. Do not exceed the prescribed dose.',
                'Do not combine with sedatives, sleeping pills, or painkillers.',
                'Store securely away from children and other pets.',
                'Inform your treating veterinarian about using CBD for your pet\u2019s medical condition.',
                'Limit to only one type of CBD product within a 24-hour period.',
                'Ensure fresh drinking water is available and let your pet rest after dosing.'
            ],
            female: '',
            oil: [],
            pillsOrGummies: []
        },
        pdfText: {
            telehealthNotice: 'This prescription is generated on tele-consultation (no physical contact with the pet).',
            travelAdvisory: 'For domestic travel within India: Please carry this prescription with you when traveling with Qurist products. International travel advisory: Qurist products contain CBD. Check laws and regulations of all points in your journey. Approved for use in India. Kindly ensure compliance with local regulations when abroad.',
            safetyAdvisory: 'In case of adverse reaction or accidental overdose by a pet, seek immediate veterinary attention and carry the product label.',
            occupationalSafetyAdvisory: '',
            patientAgreement: 'This veterinary prescription is solely for therapeutic purposes and should not be used for medico-legal purposes.',
            contactInformation: 'For any further queries, please contact: +91 8448298093'
        },
        doctors: [
            {
                id: 'dr_satish',
                name: 'Dr. Satish Verma',
                designation: 'BVSc & AH',
                regNo: 'DVC/0481',
                email: 'drsatish@qurist.in',
                driveFolderId: '',
                signatureDataUrl: ''
            },
            {
                id: 'dr_rohit_vet',
                name: 'Dr. Rohit Yenukoti',
                designation: 'BVSc & AH',
                regNo: '134654',
                email: 'rohityenukoti@qurist.in',
                driveFolderId: '12FVNhVQmwUF_6iw7Ky3JcCRdfc7-Hn9P',
                signatureDataUrl: ''
            }
        ],
        footer: {
            companyName: 'Hemp Health Pvt. Ltd.',
            cin: 'CIN No. U2423 | HR2020PTC087774',
            website: 'www.qurist.in',
            instagram: '@quristcbd',
            facebook: '@quristcbd'
        }
    };

    window.QURIST_DEFAULT_APP_CONFIG = defaultAppConfig;
    window.QURIST_DEFAULT_VET_CONFIG = defaultVetConfig;
    window.cloneQuristConfig = function (config) {
        return deepClone(config || defaultAppConfig);
    };
    window.cloneQuristVetConfig = function (config) {
        return deepClone(config || defaultVetConfig);
    };
    window.mergeQuristConfig = function (overrides) {
        return mergeConfig(defaultAppConfig, overrides);
    };
    window.mergeQuristVetConfig = function (overrides) {
        return mergeConfig(defaultVetConfig, overrides);
    };
})();

