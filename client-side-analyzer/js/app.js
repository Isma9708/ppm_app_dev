/**
 * Dispute Analysis Tool - Client Side
 * Main application file for handling file uploads and data processing
 */

document.addEventListener('DOMContentLoaded', function() {
    setupUploadPage();
});

/**
 * Setup functionality for the upload page
 */
function setupUploadPage() {
    const uploadForm = document.getElementById('uploadForm');
    if (!uploadForm) return;
    
    const fileInputs = document.querySelectorAll('.file-input');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const alertContainer = document.querySelector('.alert-container');
    
    // Update filename display when files are selected
    fileInputs.forEach(input => {
        input.addEventListener('change', function() {
            const fileNameElement = this.closest('.file-upload-area').querySelector('.file-name');
            if (this.files && this.files[0]) {
                fileNameElement.textContent = this.files[0].name;
            } else {
                fileNameElement.textContent = '';
            }
        });
    });
    
    // Form submission
    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate all files are selected
        let allFilesSelected = true;
        fileInputs.forEach(input => {
            if (!input.files || input.files.length === 0) {
                input.classList.add('is-invalid');
                allFilesSelected = false;
            } else {
                input.classList.remove('is-invalid');
            }
        });
        
        if (!allFilesSelected) {
            showAlert('Please select all required files', 'danger');
            return;
        }
        
        // Show loading overlay
        loadingOverlay.classList.remove('d-none');
        
        try {
            // Read all Excel files
            const billbackFile = document.getElementById('billback').files[0];
            const itemRefFile = document.getElementById('item_ref').files[0];
            const ppmFile = document.getElementById('ppm').files[0];
            const statesFile = document.getElementById('states').files[0];
            
            // Process each file in parallel
            const [billbackData, itemRefData, ppmData, statesData] = await Promise.all([
                readExcelFile(billbackFile),
                readExcelFile(itemRefFile),
                readExcelFile(ppmFile),
                readExcelFile(statesFile)
            ]);
            
            // Extract filter options
            const filterOptions = extractFilterOptions(billbackData, itemRefData, ppmData, statesData);
            
            // Store data in localStorage (with size check)
            const dataToStore = {
                billbackData,
                itemRefData,
                ppmData,
                statesData,
                filterOptions,
                timestamp: new Date().toISOString()
            };
            
            // Check if data is too large for localStorage (limit ~5MB)
            const dataString = JSON.stringify(dataToStore);
            if (dataString.length > 4.5 * 1024 * 1024) {
                throw new Error("Data is too large for browser storage. Please try with smaller files.");
            }
            
            localStorage.setItem('disputeAnalysisData', dataString);
            
            // Show success message
            showAlert('Files processed successfully! Redirecting to analysis...', 'success');
            
            // Redirect to analyzer page after short delay
            setTimeout(() => {
                window.location.href = 'analyzer.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error processing files:', error);
            showAlert(`Error processing files: ${error.message}`, 'danger');
        } finally {
            // Hide loading overlay
            loadingOverlay.classList.add('d-none');
        }
    });
}

/**
 * Read Excel file and convert to JSON
 */
async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Get first sheet
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                
                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(sheet);
                resolve(jsonData);
            } catch (error) {
                reject(new Error(`Failed to parse Excel file: ${error.message}`));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Error reading file'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Extract filter options from dataframes
 */
function extractFilterOptions(billbackData, itemRefData, ppmData, statesData) {
    const options = {};
    
    try {
        // Get state abbreviations (add custom abbreviation if needed)
        const statesWithCustom = addCustomAbbreviation(statesData);
        options.markets = [...new Set(statesWithCustom
            .filter(row => row['Custom Abbreviation'])
            .map(row => row['Custom Abbreviation']))].sort();
        
        // Get brand + package size options
        if (itemRefData.length > 0) {
            const brandsPk = itemRefData.map(row => {
                const brand = row['Supp. Brand Desc.'] || '';
                const pkSize = row['Package Size'] || '';
                return `${brand} ${pkSize}`.trim();
            }).filter(Boolean);
            
            options.brands_pk = [...new Set(brandsPk)].sort();
        } else {
            options.brands_pk = [];
        }
        
        // Get years from both dataframes
        const years = new Set();
        
        // Extract years from billback
        if (billbackData.length > 0 && 'Posting Period ' in billbackData[0]) {
            billbackData.forEach(row => {
                if (row['Posting Period ']) {
                    const date = parseDate(row['Posting Period ']);
                    if (date) years.add(date.getFullYear());
                }
            });
        }
        
        // Extract years from PPM
        if (ppmData.length > 0 && 'Start' in ppmData[0]) {
            ppmData.forEach(row => {
                if (row['Start']) {
                    const date = parseDate(row['Start']);
                    if (date) years.add(date.getFullYear());
                }
            });
        }
        
        options.years = [...years].sort();
        options.months = ["January", "February", "March", "April", "May", "June",
                         "July", "August", "September", "October", "November", "December"];
        
        return options;
        
    } catch (error) {
        console.error('Error extracting filter options:', error);
        return {
            markets: ['FL'],
            brands_pk: [],
            years: [],
            months: ["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"]
        };
    }
}

/**
 * Add custom abbreviation to states dataframe
 */
function addCustomAbbreviation(statesData) {
    return statesData.map(row => {
        // Copy row and add custom abbreviation
        const newRow = {...row};
        
        // Add custom abbreviation field if it doesn't exist
        if (!('Custom Abbreviation' in newRow)) {
            let customAbbr = '';
            
            // Try to use state abbreviation if available
            if ('State Abbr' in newRow && newRow['State Abbr']) {
                customAbbr = newRow['State Abbr'];
            } 
            // If no state abbr, try state name
            else if ('State Name' in newRow && newRow['State Name']) {
                const stateName = newRow['State Name'];
                if (stateName.length >= 2) {
                    customAbbr = stateName.substring(0, 2).toUpperCase();
                }
            }
            
            newRow['Custom Abbreviation'] = customAbbr;
        }
        
        return newRow;
    });
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Try to parse the date string
    const date = new Date(dateStr);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
        // If not valid, try other formats
        // MM/DD/YYYY
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[0] - 1, parts[1]);
        }
        
        return null;
    }
    
    return date;
}

/**
 * Show an alert message
 */
function showAlert(message, type) {
    const alertContainer = document.querySelector('.alert-container');
    if (!alertContainer) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (document.body.contains(alert)) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}
