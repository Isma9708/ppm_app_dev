/**
 * Dispute Analysis Tool - Main JavaScript
 */

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
