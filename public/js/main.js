/**
 * Dispute Analysis Tool - Main JavaScript
 */

// Global state for manual matching
const manualMatchState = {
    billbackSelected: null,
    ppmSelected: null,
    billbackData: [],
    ppmData: [],
    matchedPairs: [],
    sessionId: null
};

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the index page or analyzer page
    const isIndexPage = window.location.pathname === '/' || 
                        window.location.pathname === '/index.html' || 
                        window.location.pathname.includes('/templates/index.html');
    
    const isAnalyzerPage = window.location.pathname.includes('/analyzer');
    
    if (isIndexPage) {
        setupUploadPage();
    } else if (isAnalyzerPage) {
        setupAnalyzerPage();
    }
});

/**
 * Setup functionality for the upload page
 */
function setupUploadPage() {
    const uploadForm = document.getElementById('uploadForm');
    if (!uploadForm) return;
    
    const uploadBtn = document.getElementById('uploadBtn');
    const alertContainer = document.querySelector('.alert-container');
    const fileInputs = document.querySelectorAll('.file-input');
    
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
    uploadForm.addEventListener('submit', function(e) {
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
        
        // Show loading state
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Uploading...';
        
        // Create FormData
        const formData = new FormData(uploadForm);
        
        // Send to server
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showAlert('Files uploaded successfully! Redirecting to analysis...', 'success');
                
                // Store session ID
                localStorage.setItem('sessionId', data.sessionId);
                
                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = `/analyzer?sessionId=${data.sessionId}`;
                }, 2000);
            } else {
                throw new Error(data.message || 'Unknown error occurred');
            }
        })
        .catch(error => {
            console.error('Upload error:', error);
            showAlert(`Upload failed: ${error.message}. Make sure the server is running.`, 'danger');
        })
        .finally(() => {
            // Reset button state
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i> Upload and Continue';
        });
    });
}

/**
 * Setup functionality for the analyzer page
 */
function setupAnalyzerPage() {
    // Get session ID from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId') || localStorage.getItem('sessionId');
    manualMatchState.sessionId = sessionId;
    
    if (!sessionId) {
        showAlert('No session found. Please upload files first.', 'danger');
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
        return;
    }
    
    // Load filter options
    loadFilterOptions(sessionId);
    
    // Set up event listeners
    const runButton = document.querySelector('button[onclick="executeAnalysis()"]');
    if (runButton) {
        runButton.onclick = () => executeAnalysis(sessionId);
    }
    
    const clearButton = document.querySelector('button[onclick="clearFilters()"]');
    if (clearButton) {
        clearButton.onclick = clearFilters;
    }
    
    const exportButton = document.getElementById('exportBtn');
    if (exportButton) {
        exportButton.onclick = () => {
            window.location.href = `/export_excel?sessionId=${sessionId}`;
        };
    }
    
    // Initialize manual matching functionality
    initializeManualMatching();
    
    // Initialize DataTables for main results table
    if ($.fn.DataTable.isDataTable('#resultsTable')) {
        $('#resultsTable').DataTable().destroy();
    }
    
    $('#resultsTable').DataTable({
        ordering: true,
        paging: true,
        searching: true,
        responsive: true,
        lengthMenu: [10, 25, 50, 100],
        language: {
            search: "_INPUT_",
            searchPlaceholder: "Search results...",
            lengthMenu: "Show _MENU_ entries",
            info: "Showing _START_ to _END_ of _TOTAL_ entries",
            infoEmpty: "Showing 0 to 0 of 0 entries",
            infoFiltered: "(filtered from _MAX_ total entries)"
        }
    });
}

/**
 * Initialize manual matching functionality
 */
function initializeManualMatching() {
    // Initialize DataTables for matching tables
    if ($.fn.DataTable.isDataTable('#billbackTable')) {
        $('#billbackTable').DataTable().destroy();
    }
    
    if ($.fn.DataTable.isDataTable('#ppmTable')) {
        $('#ppmTable').DataTable().destroy();
    }
    
    // Initialize Billback table with selection functionality
    const billbackTable = $('#billbackTable').DataTable({
        ordering: true,
        paging: true,
        searching: true,
        lengthMenu: [10, 25, 50],
        select: {
            style: 'single'
        },
        columnDefs: [
            { width: '20%', targets: 0 },
            { width: '20%', targets: 1 },
            { width: '20%', targets: 2 },
            { width: '20%', targets: 3 },
            { width: '20%', targets: 4 }
        ],
        language: {
            search: "_INPUT_",
            searchPlaceholder: "Search billback data...",
            emptyTable: "No billback data available"
        }
    });
    
    // Initialize PPM table with selection functionality
    const ppmTable = $('#ppmTable').DataTable({
        ordering: true,
        paging: true,
        searching: true,
        lengthMenu: [10, 25, 50],
        select: {
            style: 'single'
        },
        columnDefs: [
            { width: '20%', targets: 0 },
            { width: '20%', targets: 1 },
            { width: '20%', targets: 2 },
            { width: '20%', targets: 3 },
            { width: '20%', targets: 4 }
        ],
        language: {
            search: "_INPUT_",
            searchPlaceholder: "Search PPM data...",
            emptyTable: "No PPM data available"
        }
    });
    
    // Setup selection listeners for billback table
    $('#billbackTable tbody').on('click', 'tr', function() {
        const rowData = billbackTable.row(this).data();
        if (rowData) {
            manualMatchState.billbackSelected = {
                index: billbackTable.row(this).index(),
                material: rowData[0],
                caseInPart: rowData[1],
                partAmount: rowData[2],
                extendedPart: rowData[3],
                status: rowData[4]
            };
            
            // Update UI
            updateMatchButtonState();
            updateMatchDetails();
            
            // Highlight selected row
            $('#billbackTable tbody tr').removeClass('selected-row');
            $(this).addClass('selected-row');
        }
    });
    
    // Setup selection listeners for PPM table
    $('#ppmTable tbody').on('click', 'tr', function() {
        const rowData = ppmTable.row(this).data();
        if (rowData) {
            manualMatchState.ppmSelected = {
                index: ppmTable.row(this).index(),
                material: rowData[0],
                netPrice: rowData[1],
                quantity: rowData[2],
                unitRebate: rowData[3],
                status: rowData[4]
            };
            
            // Update UI
            updateMatchButtonState();
            updateMatchDetails();
            
            // Highlight selected row
            $('#ppmTable tbody tr').removeClass('selected-row');
            $(this).addClass('selected-row');
        }
    });
    
    // Show only unmatched checkbox functionality
    $('#showOnlyUnmatchedCheck').on('change', function() {
        const showOnlyUnmatched = $(this).is(':checked');
        
        if (showOnlyUnmatched) {
            billbackTable.column(4).search('Unmatched').draw();
            ppmTable.column(4).search('Unmatched').draw();
        } else {
            billbackTable.column(4).search('').draw();
            ppmTable.column(4).search('').draw();
        }
    });
    
    // Match selected button click handler
    $('#matchSelectedBtn').on('click', function() {
        if (manualMatchState.billbackSelected && manualMatchState.ppmSelected) {
            createManualMatch();
        }
    });
    
    // Unmatch selected button click handler
    $('#unmatchSelectedBtn').on('click', function() {
        if (manualMatchState.billbackSelected && manualMatchState.ppmSelected) {
            removeManualMatch();
        }
    });
    
    // Recalculate button click handler
    $('#recalculateBtn').on('click', function() {
        recalculateAnalysis();
    });
    
    // Show manual matching tab handler
    $('#manual-match-tab').on('shown.bs.tab', function() {
        loadManualMatchingData();
    });
}

/**
 * Load data for manual matching tables
 */
function loadManualMatchingData() {
    const sessionId = manualMatchState.sessionId;
    if (!sessionId) return;
    
    showLoading(true);
    
    // Get selected filter values
    const market = document.getElementById('market').value;
    const brand = document.getElementById('brand').value;
    const year = document.getElementById('year').value;
    const month = document.getElementById('month').value;
    
    // Validate selections
    if (!market || !brand || !year || !month) {
        showAlert('Please run analysis with all filter options selected before attempting manual matching.', 'warning');
        showLoading(false);
        return;
    }
    
    // Fetch data for manual matching
    fetch('/manual-match-data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sessionId,
            market,
            brand,
            year,
            month
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Store data
            manualMatchState.billbackData = data.billbackData;
            manualMatchState.ppmData = data.ppmData;
            manualMatchState.matchedPairs = data.matchedPairs;
            
            // Populate tables
            populateManualMatchingTables(data);
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    })
    .catch(error => {
        console.error('Error loading manual matching data:', error);
        showAlert(`Error loading manual matching data: ${error.message}`, 'danger');
    })
    .finally(() => {
        showLoading(false);
    });
}

/**
 * Populate the manual matching tables with data
 */
function populateManualMatchingTables(data) {
    const billbackTable = $('#billbackTable').DataTable();
    const ppmTable = $('#ppmTable').DataTable();
    
    // Clear existing data
    billbackTable.clear();
    ppmTable.clear();
    
    // Add billback data
    data.billbackData.forEach(row => {
        // Determine match status
        let status = 'Unmatched';
        for (const pair of data.matchedPairs) {
            if (pair.billbackIndex === row.index) {
                status = 'Matched';
                break;
            }
        }
        
        billbackTable.row.add([
            row.material,
            row.caseInPart,
            `$${row.partAmount.toFixed(2)}`,
            `$${row.extendedPart.toFixed(2)}`,
            status
        ]);
    });
    
    // Add PPM data
    data.ppmData.forEach(row => {
        // Determine match status
        let status = 'Unmatched';
        for (const pair of data.matchedPairs) {
            if (pair.ppmIndex === row.index) {
                status = 'Matched';
                break;
            }
        }
        
        ppmTable.row.add([
            row.material,
            `$${row.netPrice.toFixed(2)}`,
            row.quantity,
            `$${row.unitRebate.toFixed(2)}`,
            status
        ]);
    });
    
    // Redraw the tables
    billbackTable.draw();
    ppmTable.draw();
    
    // Reset selection state
    manualMatchState.billbackSelected = null;
    manualMatchState.ppmSelected = null;
    updateMatchButtonState();
    updateMatchDetails();
}

/**
 * Update match button enabled/disabled state based on selections
 */
function updateMatchButtonState() {
    const matchBtn = document.getElementById('matchSelectedBtn');
    const unmatchBtn = document.getElementById('unmatchSelectedBtn');
    
    if (manualMatchState.billbackSelected && manualMatchState.ppmSelected) {
        matchBtn.disabled = false;
        
        // Check if this pair is already matched
        const isMatched = manualMatchState.matchedPairs.some(
            pair => pair.billbackIndex === manualMatchState.billbackSelected.index && 
                   pair.ppmIndex === manualMatchState.ppmSelected.index
        );
        
        unmatchBtn.disabled = !isMatched;
    } else {
        matchBtn.disabled = true;
        unmatchBtn.disabled = true;
    }
}

/**
 * Update the current match details display
 */
function updateMatchDetails() {
    const billback = manualMatchState.billbackSelected;
    const ppm = manualMatchState.ppmSelected;
    
    if (billback && ppm) {
        // Update billback row
        document.querySelector('#billbackMatchRow td:nth-child(2)').textContent = billback.material;
        document.querySelector('#billbackMatchRow td:nth-child(3)').textContent = billback.caseInPart;
        document.querySelector('#billbackMatchRow td:nth-child(4)').textContent = `$${parseFloat(billback.extendedPart.replace('$', '')).toFixed(2)}`;
        
        // Update PPM row
        document.querySelector('#ppmMatchRow td:nth-child(2)').textContent = ppm.material;
        document.querySelector('#ppmMatchRow td:nth-child(3)').textContent = ppm.quantity;
        document.querySelector('#ppmMatchRow td:nth-child(4)').textContent = `$${parseFloat(ppm.netPrice.replace('$', '')).toFixed(2)}`;
        
        // Calculate variance
        const billbackAmount = parseFloat(billback.extendedPart.replace('$', ''));
        const ppmAmount = parseFloat(ppm.netPrice.replace('$', ''));
        const variance = ppmAmount - billbackAmount;
        
        document.getElementById('matchVariance').textContent = `$${variance.toFixed(2)}`;
        document.getElementById('matchVariance').className = variance < 0 ? 'text-danger' : 'text-success';
        
        document.getElementById('currentMatchDetails').textContent = 
            `Viewing potential match between Billback Material ${billback.material} and PPM Material ${ppm.material}`;
    } else {
        // Reset to default state
        document.querySelector('#billbackMatchRow td:nth-child(2)').textContent = '-';
        document.querySelector('#billbackMatchRow td:nth-child(3)').textContent = '-';
        document.querySelector('#billbackMatchRow td:nth-child(4)').textContent = '-';
        
        document.querySelector('#ppmMatchRow td:nth-child(2)').textContent = '-';
        document.querySelector('#ppmMatchRow td:nth-child(3)').textContent = '-';
        document.querySelector('#ppmMatchRow td:nth-child(4)').textContent = '-';
        
        document.getElementById('matchVariance').textContent = '-';
        document.getElementById('matchVariance').className = '';
        
        document.getElementById('currentMatchDetails').textContent = 
            'No match selected. Select rows from both tables to see match details.';
    }
}

/**
 * Create a manual match between selected billback and PPM rows
 */
function createManualMatch() {
    const sessionId = manualMatchState.sessionId;
    const billback = manualMatchState.billbackSelected;
    const ppm = manualMatchState.ppmSelected;
    
    if (!sessionId || !billback || !ppm) {
        showAlert('Please select items from both tables to match.', 'warning');
        return;
    }
    
    showLoading(true);
    
    fetch('/create-manual-match', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sessionId,
            billbackIndex: billback.index,
            ppmIndex: ppm.index
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showAlert('Manual match created successfully!', 'success');
            
            // Update local state
            manualMatchState.matchedPairs = data.matchedPairs;
            
            // Refresh tables
            loadManualMatchingData();
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    })
    .catch(error => {
        console.error('Error creating manual match:', error);
        showAlert(`Error creating manual match: ${error.message}`, 'danger');
    })
    .finally(() => {
        showLoading(false);
    });
}

/**
 * Remove a manual match between selected billback and PPM rows
 */
function removeManualMatch() {
    const sessionId = manualMatchState.sessionId;
    const billback = manualMatchState.billbackSelected;
    const ppm = manualMatchState.ppmSelected;
    
    if (!sessionId || !billback || !ppm) {
        showAlert('Please select a matched pair to unmatch.', 'warning');
        return;
    }
    
    // Check if this pair is actually matched
    const isMatched = manualMatchState.matchedPairs.some(
        pair => pair.billbackIndex === billback.index && pair.ppmIndex === ppm.index
    );
    
    if (!isMatched) {
        showAlert('These items are not currently matched.', 'warning');
        return;
    }
    
    showLoading(true);
    
    fetch('/remove-manual-match', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sessionId,
            billbackIndex: billback.index,
            ppmIndex: ppm.index
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showAlert('Manual match removed successfully!', 'success');
            
            // Update local state
            manualMatchState.matchedPairs = data.matchedPairs;
            
            // Refresh tables
            loadManualMatchingData();
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    })
    .catch(error => {
        console.error('Error removing manual match:', error);
        showAlert(`Error removing manual match: ${error.message}`, 'danger');
    })
    .finally(() => {
        showLoading(false);
    });
}

/**
 * Recalculate analysis using current manual matches
 */
function recalculateAnalysis() {
    const sessionId = manualMatchState.sessionId;
    if (!sessionId) return;
    
    showLoading(true);
    
    // Get selected filter values
    const market = document.getElementById('market').value;
    const brand = document.getElementById('brand').value;
    const year = document.getElementById('year').value;
    const month = document.getElementById('month').value;
    
    fetch('/recalculate-analysis', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sessionId,
            market,
            brand,
            year,
            month
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showAlert('Analysis recalculated successfully with manual matches!', 'success');
            
            // Display updated results
            displayResults(data);
            
            // Switch to results tab
            document.getElementById('results-tab').click();
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    })
    .catch(error => {
        console.error('Error recalculating analysis:', error);
        showAlert(`Error recalculating analysis: ${error.message}`, 'danger');
    })
    .finally(() => {
        showLoading(false);
    });
}

/**
 * Load filter options from the server
 */
function loadFilterOptions(sessionId) {
    showLoading(true);
    
    fetch(`/filter-options?sessionId=${sessionId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                populateFilterOptions(data.filterOptions);
            } else {
                showAlert(`Error loading filter options: ${data.message}`, 'danger');
            }
        })
        .catch(error => {
            console.error('Error loading filter options:', error);
            showAlert(`Error loading filter options: ${error.message}`, 'danger');
        })
        .finally(() => {
            showLoading(false);
        });
}

/**
 * Populate filter dropdowns with options
 */
function populateFilterOptions(options) {
    // Market dropdown
    const marketSelect = document.getElementById('market');
    if (marketSelect && options.markets) {
        options.markets.forEach(market => {
            const option = document.createElement('option');
            option.value = market;
            option.textContent = market;
            marketSelect.appendChild(option);
        });
    }
    
    // Brand dropdown
    const brandSelect = document.getElementById('brand');
    if (brandSelect && options.brands_pk) {
        options.brands_pk.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandSelect.appendChild(option);
        });
    }
    
    // Year dropdown
    const yearSelect = document.getElementById('year');
    if (yearSelect && options.years) {
        options.years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    }
    
    // Month dropdown
    const monthSelect = document.getElementById('month');
    if (monthSelect && options.months) {
        options.months.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = month;
            monthSelect.appendChild(option);
        });
    }
}

/**
 * Run the analysis based on selected filters
 */
function executeAnalysis(sessionId) {
    // Get filter values
    const market = document.getElementById('market').value;
    const brand = document.getElementById('brand').value;
    const year = document.getElementById('year').value;
    const month = document.getElementById('month').value;
    
    // Validate selections
    if (!market || !brand || !year || !month) {
        showAlert('Please select all filter options before running analysis.', 'warning');
        return;
    }
    
    // Show loading state
    showLoading(true);
    
    // Send analysis request
    fetch('/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sessionId,
            market,
            brand,
            year,
            month
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Display results
            displayResults(data);
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    })
    .catch(error => {
        console.error('Analysis error:', error);
        showAlert(`Analysis failed: ${error.message}`, 'danger');
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('noResultsMessage').style.display = 'block';
    })
    .finally(() => {
        showLoading(false);
    });
}

/**
 * Display analysis results
 */
function displayResults(data) {
    // Hide no results message
    document.getElementById('noResultsMessage').style.display = 'none';
    
    // Show results section
    document.getElementById('resultsSection').style.display = 'block';
    
    // Update statistics
    const stats = data.stats;
    document.getElementById('totalRecords').textContent = stats.total_records;
    document.getElementById('perfectMatches').textContent = stats.perfect_matches;
    document.getElementById('perfectMatchesPercent').textContent = `${stats.percent_matched.toFixed(1)}%`;
    document.getElementById('mismatches').textContent = stats.mismatches;
    document.getElementById('missingDeals').textContent = `${stats.missing_deals} Missing Deals`;
    document.getElementById('totalVariance').textContent = `$${stats.total_variance.toFixed(2)}`;
    
    // Show export button
    document.getElementById('exportBtn').style.display = 'inline-block';
    
    // Populate results table
    populateResultsTable(data.data);
    
    // Create visualizations
    createVisualizations(data.visualizations);
    
    // Reset manual matching tab
    manualMatchState.billbackSelected = null;
    manualMatchState.ppmSelected = null;
}

/**
 * Populate the results table with data
 */
function populateResultsTable(data) {
    const table = $('#resultsTable').DataTable();
    
    // Clear existing data
    table.clear();
    
    // Add new data
    data.forEach(row => {
        table.row.add([
            row.Material,
            row['At price'],
            row['Case in Part'],
            row['Part Amount'],
            row['Extended Part'],
            row['Net$'],
            row['Quantity'],
            row['Unit Rebate$'],
            row['Rebate'],
            row['VAR'],
            row['Comment']
        ]);
    });
    
    // Redraw the table
    table.draw();
}

/**
 * Create visualizations using Plotly
 */
function createVisualizations(visualizations) {
    // Match distribution pie chart
    if (visualizations.match_distribution) {
        Plotly.newPlot('matchDistributionChart', 
            visualizations.match_distribution.data, 
            visualizations.match_distribution.layout);
    }
    
    // Variance by type bar chart
    if (visualizations.variance_by_type) {
        Plotly.newPlot('varianceByTypeChart', 
            visualizations.variance_by_type.data, 
            visualizations.variance_by_type.layout);
    }
    
    // Variance distribution histogram
    if (visualizations.variance_distribution) {
        Plotly.newPlot('varianceDistributionChart', 
            visualizations.variance_distribution.data, 
            visualizations.variance_distribution.layout);
    }
    
    // Top materials chart
    if (visualizations.top_materials) {
        Plotly.newPlot('topMaterialsChart', 
            visualizations.top_materials.data, 
            visualizations.top_materials.layout);
    }
    
    // Bill Back vs PPM comparison chart
    if (visualizations.billback_vs_ppm) {
        Plotly.newPlot('billbackVsPpmChart', 
            visualizations.billback_vs_ppm.data, 
            visualizations.billback_vs_ppm.layout);
    }
}

/**
 * Clear all filter selections
 */
function clearFilters() {
    document.getElementById('market').selectedIndex = 0;
    document.getElementById('brand').selectedIndex = 0;
    document.getElementById('year').selectedIndex = 0;
    document.getElementById('month').selectedIndex = 0;
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('noResultsMessage').style.display = 'none';
}

/**
 * Show or hide loading overlay
 */
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.remove('d-none');
        } else {
            loadingOverlay.classList.add('d-none');
        }
    }
}

/**
 * Generate report based on selected format
 */
function generateReport() {
    const sessionId = new URLSearchParams(window.location.search).get('sessionId') || 
                       localStorage.getItem('sessionId');
    
    if (!sessionId) {
        showAlert('No session found. Please run analysis first.', 'danger');
        return;
    }
    
    // Get selected format
    const formatRadios = document.getElementsByName('reportFormat');
    let selectedFormat = 'html';
    
    for (const radio of formatRadios) {
        if (radio.checked) {
            selectedFormat = radio.value;
            break;
        }
    }
    
    // Show loading state
    showLoading(true);
    
    // Send request to generate report
    fetch('/generate-report', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sessionId,
            format: selectedFormat
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Show report
            const reportContainer = document.getElementById('reportContainer');
            const reportContent = document.getElementById('reportContent');
            
            reportContainer.style.display = 'block';
            
            if (data.format === 'html') {
                reportContent.innerHTML = data.report;
            } else {
                reportContent.innerHTML = `<pre>${data.report}</pre>`;
            }
            
            // Scroll to report
            reportContainer.scrollIntoView({ behavior: 'smooth' });
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    })
    .catch(error => {
        console.error('Report generation error:', error);
        showAlert(`Report generation failed: ${error.message}`, 'danger');
    })
    .finally(() => {
        showLoading(false);
    });
}

/**
 * Save generated report
 */
function saveReport() {
    const reportContent = document.getElementById('reportContent').innerHTML;
    const formatRadios = document.getElementsByName('reportFormat');
    let selectedFormat = 'html';
    
    for (const radio of formatRadios) {
        if (radio.checked) {
            selectedFormat = radio.value;
            break;
        }
    }
    
    let filename, content, mimeType;
    
    if (selectedFormat === 'html') {
        filename = 'dispute_analysis_report.html';
        content = `<!DOCTYPE html><html><head><title>Dispute Analysis Report</title>
                  <style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px;}</style>
                  </head><body>${reportContent}</body></html>`;
        mimeType = 'text/html';
    } else if (selectedFormat === 'markdown') {
        filename = 'dispute_analysis_report.md';
        // Extract plain text from HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = reportContent;
        content = tempDiv.textContent || tempDiv.innerText || '';
        mimeType = 'text/markdown';
    } else {
        filename = 'dispute_analysis_report.txt';
        // Extract plain text from HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = reportContent;
        content = tempDiv.textContent || tempDiv.innerText || '';
        mimeType = 'text/plain';
    }
    
    // Create blob and download
    const blob = new Blob([content], { type: mimeType });
    saveAs(blob, filename);
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
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            if (bsAlert) {
                bsAlert.close();
            } else {
                alert.remove();
            }
        }
    }, 5000);
}
