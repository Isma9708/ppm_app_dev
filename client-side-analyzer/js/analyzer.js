/**
 * Dispute Analysis Tool - Client Side
 * Analyzer page functionality
 */

// Global variables to store data
let disputeData = null;
let resultsTable = null;
let analysisResults = null;
let analysisStats = null;

document.addEventListener('DOMContentLoaded', function() {
    setupAnalyzerPage();
});

/**
 * Setup functionality for the analyzer page
 */
function setupAnalyzerPage() {
    // Check if we have data
    const storedData = localStorage.getItem('disputeAnalysisData');
    if (!storedData) {
        showAlert('No analysis data found. Please upload files first.', 'danger');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
        return;
    }
    
    try {
        // Load stored data
        disputeData = JSON.parse(storedData);
        
        // Check if data has timestamp and it's not too old (24 hours)
        const timestamp = new Date(disputeData.timestamp);
        const now = new Date();
        const hoursDiff = (now - timestamp) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
            showAlert('Your data is over 24 hours old. Consider re-uploading for fresh analysis.', 'warning');
        }
        
        // Initialize DataTable
        resultsTable = $('#resultsTable').DataTable({
            pageLength: 10,
            lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
            order: [[9, 'desc']] // Sort by variance column by default
        });
        
        // Populate filter dropdowns
        populateFilterOptions(disputeData.filterOptions);
        
        // Set up event handlers
        document.getElementById('runAnalysisBtn').addEventListener('click', executeAnalysis);
        document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);
        document.getElementById('exportBtn').addEventListener('click', exportToExcel);
        document.getElementById('generateReportBtn').addEventListener('click', generateReport);
        document.getElementById('saveReportBtn').addEventListener('click', saveReport);
        document.getElementById('clearBtn').addEventListener('click', clearAllData);
        
        // Show no results message
        document.getElementById('noResultsMessage').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading stored data:', error);
        showAlert('Error loading analysis data. Please re-upload your files.', 'danger');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    }
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
function executeAnalysis() {
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
    
    setTimeout(() => {
        try {
            // Prepare data
            const { billbackData, itemRefData, ppmData, statesData } = disputeData;
            
            // Add custom abbreviation to states data
            const enrichedStatesData = addCustomAbbreviation(statesData);
            
            // Enrich billback and ppm data
            const enrichedBillback = enrichBillbackTable(billbackData, enrichedStatesData, itemRefData);
            const enrichedPpm = enrichPpmTable(ppmData);
            
            // Filter data based on selections
            const months = ["January", "February", "March", "April", "May", "June",
                           "July", "August", "September", "October", "November", "December"];
            const monthNumber = months.indexOf(month) + 1;
            
            // Filter billback data
            const filteredBillback = enrichedBillback.filter(row => {
                const date = parseDate(row['Posting Period '] || row['Complete Date']);
                return row['Custom Abbreviation'] === market &&
                       row['Brand + Pk size'] === brand &&
                       date && 
                       date.getFullYear() == year &&
                       date.getMonth() + 1 === monthNumber;
            });
            
            // Filter ppm data
            const filteredPpm = enrichedPpm.filter(row => {
                const date = parseDate(row['Start']);
                return row['Dist Name.2'] === market &&
                       row['ppm_Brand+pk size'] === brand &&
                       date && 
                       date.getFullYear() == year &&
                       date.getMonth() + 1 === monthNumber;
            });
            
            // Check if we have data to analyze
            if (filteredBillback.length === 0 || filteredPpm.length === 0) {
                showLoading(false);
                showAlert('No matching records found for the selected filters.', 'warning');
                document.getElementById('resultsSection').style.display = 'none';
                document.getElementById('noResultsMessage').style.display = 'block';
                return;
            }
            
            // Run the comparison analysis
            analysisResults = analyzeMaterials(filteredBillback, filteredPpm, brand);
            
            // Calculate statistics
            analysisStats = calculateStats(analysisResults);
            
            // Display results
            displayResults(analysisResults, analysisStats);
            
            // Hide loading and success message
            showLoading(false);
            showAlert('Analysis completed successfully!', 'success');
            
        } catch (error) {
            console.error('Analysis error:', error);
            showLoading(false);
            showAlert(`Error during analysis: ${error.message}`, 'danger');
            document.getElementById('resultsSection').style.display = 'none';
            document.getElementById('noResultsMessage').style.display = 'block';
        }
    }, 500); // Small delay to ensure loading indicator shows up
}

/**
 * Add custom abbreviation to states data
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
 * Enrich billback data with additional information
 */
function enrichBillbackTable(billbackData, statesData, itemRefData) {
    return billbackData.map(row => {
        const enrichedRow = {...row};
        
        // Add 'Complete Date' if not present
        if (!('Complete Date' in enrichedRow) && ('Posting Period ' in enrichedRow)) {
            enrichedRow['Complete Date'] = enrichedRow['Posting Period '];
        }
        
        // Add custom abbreviation from states data
        if ('State' in enrichedRow) {
            const stateCode = enrichedRow['State'];
            const stateMatch = statesData.find(s => s['State Code'] === stateCode);
            if (stateMatch) {
                enrichedRow['Custom Abbreviation'] = stateMatch['Custom Abbreviation'];
            }
        }
        
        // Add Brand + Pk size from item reference
        if ('Material' in enrichedRow && itemRefData) {
            const materialCode = enrichedRow['Material'].toString();
            const itemMatch = itemRefData.find(item => item['Material'] && item['Material'].toString() === materialCode);
            
            if (itemMatch) {
                const brand = itemMatch['Supp. Brand Desc.'] || '';
                const pkSize = itemMatch['Package Size'] || '';
                enrichedRow['Brand + Pk size'] = `${brand} ${pkSize}`.trim();
            }
        }
        
        return enrichedRow;
    });
}

/**
 * Enrich PPM data with additional information
 */
function enrichPpmTable(ppmData) {
    return ppmData.map(row => {
        const enrichedRow = {...row};
        
        // Combine brand and package size
        if ('Supp. Brand Desc.' in enrichedRow && 'Package Size' in enrichedRow) {
            const brand = enrichedRow['Supp. Brand Desc.'] || '';
            const pkSize = enrichedRow['Package Size'] || '';
            enrichedRow['ppm_Brand+pk size'] = `${brand} ${pkSize}`.trim();
        }
        
        return enrichedRow;
    });
}

/**
 * Analyze and compare materials between billback and PPM data
 */
function analyzeMaterials(billbackData, ppmData, selectedBrand) {
    // Prepare data structures for comparison
    const results = [];
    
    // Create a lookup object for PPM data keyed by material/item number
    const ppmByItem = {};
    ppmData.forEach(row => {
        const distItem = (row['Dist Item#'] || '').toString().trim();
        if (distItem) {
            ppmByItem[distItem] = row;
        }
    });
    
    // Process each billback entry
    billbackData.forEach(bb => {
        const material = (bb['Material'] || '').toString().trim();
        
        // Skip if no material code
        if (!material) return;
        
        // Find matching PPM entry
        const ppm = ppmByItem[material];
        
        if (ppm) {
            // Both billback and PPM have this material
            const billbackPrice = parseFloat(bb['Net$']) || 0;
            const billbackQty = parseFloat(bb['Quantity']) || 0;
            const ppmRebate = parseFloat(ppm['Unit Rebate$']) || 0;
            
            // Calculate expected rebate
            const expectedRebate = ppmRebate * billbackQty;
            const actualRebate = parseFloat(bb['Rebate']) || 0;
            const variance = actualRebate - expectedRebate;
            
            let comment = '';
            if (Math.abs(variance) > 0.01) {
                comment = 'Price mismatch';
            }
            
            results.push({
                Material: material,
                'At price': parseFloat(bb['At price']) || 0,
                'Case in Part': parseFloat(bb['Case in Part']) || 0,
                'Part Amount': parseFloat(bb['Part Amount']) || 0,
                'Extended Part': parseFloat(bb['Extended Part']) || 0,
                'Net$': billbackPrice,
                Quantity: billbackQty,
                'Unit Rebate$': ppmRebate,
                Rebate: actualRebate,
                VAR: variance,
                Comment: comment
            });
        } else {
            // Billback has material not in PPM
            results.push({
                Material: material,
                'At price': parseFloat(bb['At price']) || 0,
                'Case in Part': parseFloat(bb['Case in Part']) || 0,
                'Part Amount': parseFloat(bb['Part Amount']) || 0,
                'Extended Part': parseFloat(bb['Extended Part']) || 0,
                'Net$': parseFloat(bb['Net$']) || 0,
                Quantity: parseFloat(bb['Quantity']) || 0,
                'Unit Rebate$': 0,
                Rebate: parseFloat(bb['Rebate']) || 0,
                VAR: parseFloat(bb['Rebate']) || 0,
                Comment: 'Missing Deal'
            });
        }
    });
    
    // Check for PPM entries not in billback
    Object.keys(ppmByItem).forEach(material => {
        const ppm = ppmByItem[material];
        const found = results.some(r => r.Material === material);
        
        if (!found) {
            // PPM has material not in billback
            results.push({
                Material: material,
                'At price': 0,
                'Case in Part': 0,
                'Part Amount': 0,
                'Extended Part': 0,
                'Net$': 0,
                Quantity: 0,
                'Unit Rebate$': parseFloat(ppm['Unit Rebate$']) || 0,
                Rebate: 0,
                VAR: 0,
                Comment: 'PPM Only'
            });
        }
    });
    
    return results;
}

/**
 * Calculate summary statistics from analysis results
 */
function calculateStats(results) {
    const perfectMatches = results.filter(r => !r.Comment).length;
    const mismatches = results.filter(r => r.Comment === 'Price mismatch').length;
    const missingDeals = results.filter(r => r.Comment === 'Missing Deal').length;
    const ppmOnly = results.filter(r => r.Comment === 'PPM Only').length;
    
    const totalVariance = results.reduce((sum, r) => sum + (r.VAR || 0), 0);
    const absVariance = results.reduce((sum, r) => sum + Math.abs(r.VAR || 0), 0);
    
    const percentMatched = results.length > 0 ? (perfectMatches / results.length) * 100 : 0;
    
    return {
        total_records: results.length,
        perfect_matches: perfectMatches,
        mismatches: mismatches,
        missing_deals: missingDeals,
        ppm_only: ppmOnly,
        total_variance: totalVariance,
        absolute_variance: absVariance,
        percent_matched: percentMatched
    };
}

/**
 * Display analysis results
 */
function displayResults(results, stats) {
    // Hide no results message
    document.getElementById('noResultsMessage').style.display = 'none';
    
    // Show results section
    document.getElementById('resultsSection').style.display = 'block';
    
    // Update statistics
    document.getElementById('totalRecords').textContent = stats.total_records;
    document.getElementById('perfectMatches').textContent = stats.perfect_matches;
    document.getElementById('perfectMatchesPercent').textContent = `${stats.percent_matched.toFixed(1)}%`;
    document.getElementById('mismatches').textContent = stats.mismatches;
    document.getElementById('totalVariance').textContent = `$${stats.total_variance.toFixed(2)}`;
    
    // Populate results table
    populateResultsTable(results);
    
    // Create visualizations
    createVisualizations(results, stats);
}

/**
 * Populate the results table with data
 */
function populateResultsTable(results) {
    const table = resultsTable;
    
    // Clear existing data
    table.clear();
    
    // Add new data
    results.forEach(row => {
        table.row.add([
            row.Material,
            formatNumber(row['At price'], 2),
            formatNumber(row['Case in Part'], 0),
            formatNumber(row['Part Amount'], 2),
            formatNumber(row['Extended Part'], 2),
            formatNumber(row['Net$'], 2),
            formatNumber(row.Quantity, 0),
            formatNumber(row['Unit Rebate$'], 2),
            formatNumber(row.Rebate, 2),
            formatNumber(row.VAR, 2),
            row.Comment || ''
        ]);
    });
    
    // Redraw the table
    table.draw();
}

/**
 * Format number with commas and specified decimal places
 */
function formatNumber(num, decimals) {
    if (num === null || num === undefined) return '';
    return Number(num).toLocaleString('en-US', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
    });
}

/**
 * Create visualizations using Plotly
 */
function createVisualizations(results, stats) {
    // Match distribution pie chart
    const pieValues = [
        stats.perfect_matches,
        stats.mismatches,
        stats.missing_deals,
        stats.ppm_only
    ];
    
    const pieLabels = [
        'Perfect Match',
        'Mismatches',
        'Missing Deals',
        'PPM Only'
    ];
    
    const pieColors = ['#28a745', '#ffc107', '#dc3545', '#ff7f50'];
    
    Plotly.newPlot('matchDistributionChart', [{
        values: pieValues,
        labels: pieLabels,
        type: 'pie',
        marker: {
            colors: pieColors
        }
    }], {
        title: 'Distribution of Match Types',
        height: 350,
        margin: { t: 50, b: 20, l: 20, r: 20 }
    });
    
    // Variance by type bar chart
    const matchTypes = ['Perfect Match', 'Mismatches', 'Missing Deals', 'PPM Only'];
    
    // Calculate variance by type
    const varianceByType = [
        results.filter(r => !r.Comment).reduce((sum, r) => sum + Math.abs(r.VAR || 0), 0),
        results.filter(r => r.Comment === 'Price mismatch').reduce((sum, r) => sum + Math.abs(r.VAR || 0), 0),
        results.filter(r => r.Comment === 'Missing Deal').reduce((sum, r) => sum + Math.abs(r.VAR || 0), 0),
        results.filter(r => r.Comment === 'PPM Only').reduce((sum, r) => sum + Math.abs(r.VAR || 0), 0)
    ];
    
    Plotly.newPlot('varianceByTypeChart', [{
        x: matchTypes,
        y: varianceByType,
        type: 'bar',
        marker: {
            color: pieColors
        }
    }], {
        title: 'Variance by Match Type',
        height: 350,
        margin: { t: 50, b: 50, l: 50, r: 20 },
        xaxis: { title: 'Match Type' },
        yaxis: { title: 'Absolute Variance ($)' }
    });
    
    // Top materials chart - Get top 5 materials by absolute variance
    const topMaterials = [...results]
        .sort((a, b) => Math.abs(b.VAR || 0) - Math.abs(a.VAR || 0))
        .slice(0, 5);
    
    Plotly.newPlot('topMaterialsChart', [{
        y: topMaterials.map(r => r.Material),
        x: topMaterials.map(r => Math.abs(r.VAR || 0)),
        type: 'bar',
        orientation: 'h',
        marker: {
            color: '#3c6e71'
        }
    }], {
        title: 'Top Materials by Variance',
        height: 350,
        margin: { t: 50, b: 50, l: 120, r: 20 }
    });
    
    // Bill Back vs PPM comparison chart - Use the same top 5 materials
    Plotly.newPlot('billbackVsPpmChart', [
        {
            x: topMaterials.map(r => r.Material),
            y: topMaterials.map(r => r.Rebate || 0),
            type: 'bar',
            name: 'Bill Back'
        },
        {
            x: topMaterials.map(r => r.Material),
            y: topMaterials.map(r => (r['Unit Rebate$'] || 0) * (r.Quantity || 0)),
            type: 'bar',
            name: 'PPM'
        }
    ], {
        title: 'Bill Back vs PPM Comparison',
        height: 350,
        margin: { t: 50, b: 50, l: 50, r: 20 },
        barmode: 'group'
    });
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
    document.getElementById('noResultsMessage').style.display = 'block';
    document.getElementById('reportContainer').style.display = 'none';
    document.getElementById('saveReportBtn').style.display = 'none';
}

/**
 * Export analysis results to Excel
 */
function exportToExcel() {
    if (!analysisResults || analysisResults.length === 0) {
        showAlert('No analysis results to export', 'warning');
        return;
    }
    
    try {
        // Create a new workbook
        const wb = XLSX.utils.book_new();
        
        // Convert results to worksheet
        const ws = XLSX.utils.json_to_sheet(analysisResults);
        
        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Analysis Results');
        
        // Generate Excel file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `dispute_analysis_results_${timestamp}.xlsx`;
        
        // Write and download
        XLSX.writeFile(wb, filename);
        
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showAlert(`Error exporting to Excel: ${error.message}`, 'danger');
    }
}

/**
 * Generate report based on selected format
 */
function generateReport() {
    if (!analysisResults || !analysisStats) {
        showAlert('No analysis results available. Please run analysis first.', 'warning');
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
    
    setTimeout(() => {
        try {
            // Generate report content
            const reportContent = generateReportContent(selectedFormat);
            
            // Show report
            const reportContainer = document.getElementById('reportContainer');
            const reportContentEl = document.getElementById('reportContent');
            
            reportContainer.style.display = 'block';
            document.getElementById('saveReportBtn').style.display = 'inline-block';
            
            if (selectedFormat === 'html') {
                reportContentEl.innerHTML = reportContent;
            } else {
                reportContentEl.innerHTML = `<pre>${reportContent}</pre>`;
            }
            
            // Scroll to report
            reportContainer.scrollIntoView({ behavior: 'smooth' });
            
            showLoading(false);
            
        } catch (error) {
            console.error('Error generating report:', error);
            showLoading(false);
            showAlert(`Error generating report: ${error.message}`, 'danger');
        }
    }, 500);
}

/**
 * Generate report content based on format
 */
function generateReportContent(format) {
    const stats = analysisStats;
    const results = analysisResults;
    const currentDate = new Date().toLocaleString();
    
    // Get selected filters
    const market = document.getElementById('market').value;
    const brand = document.getElementById('brand').value;
    const year = document.getElementById('year').value;
    const month = document.getElementById('month').value;
    
    if (format === 'html') {
        return `
            <h2>Dispute Analysis Report</h2>
            <p><strong>Generated:</strong> ${currentDate}</p>
            <p><strong>Filters:</strong> Market: ${market}, Brand: ${brand}, Period: ${month} ${year}</p>
            
            <h3>Summary Statistics</h3>
            <table class="table table-bordered">
                <tr>
                    <th>Total Records</th>
                    <td>${stats.total_records}</td>
                </tr>
                <tr>
                    <th>Perfect Matches</th>
                    <td>${stats.perfect_matches} (${stats.percent_matched.toFixed(1)}%)</td>
                </tr>
                <tr>
                    <th>Mismatches</th>
                    <td>${stats.mismatches}</td>
                </tr>
                <tr>
                    <th>Missing Deals</th>
                    <td>${stats.missing_deals}</td>
                </tr>
                <tr>
                    <th>PPM Only</th>
                    <td>${stats.ppm_only}</td>
                </tr>
                <tr>
                    <th>Total Variance</th>
                    <td>$${stats.total_variance.toFixed(2)}</td>
                </tr>
            </table>
            
            <h3>Recommendations</h3>
            <ul>
                ${stats.mismatches > 0 ? `<li>Review the ${stats.mismatches} mismatched records to identify pricing discrepancies</li>` : ''}
                ${stats.missing_deals > 0 ? `<li>Follow up on the ${stats.missing_deals} missing deals</li>` : ''}
                ${Math.abs(stats.total_variance) > 0.01 ? `<li>Address the total variance of $${stats.total_variance.toFixed(2)}</li>` : ''}
                ${stats.percent_matched < 90 ? `<li>Investigate why only ${stats.percent_matched.toFixed(1)}% of records matched perfectly</li>` : ''}
            </ul>
            
            <h3>Top Variance Materials</h3>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Material</th>
                        <th>Variance</th>
                        <th>Issue</th>
                    </tr>
                </thead>
                <tbody>
                    ${results
                        .sort((a, b) => Math.abs(b.VAR || 0) - Math.abs(a.VAR || 0))
                        .slice(0, 5)
                        .map(r => `
                            <tr>
                                <td>${r.Material}</td>
                                <td>$${(r.VAR || 0).toFixed(2)}</td>
                                <td>${r.Comment || 'None'}</td>
                            </tr>
                        `).join('')}
                </tbody>
            </table>
            
            <p><em>This report was generated automatically by the Dispute Analysis Tool.</em></p>
        `;
    } else if (format === 'markdown') {
        return `
# Dispute Analysis Report
**Generated:** ${currentDate}
**Filters:** Market: ${market}, Brand: ${brand}, Period: ${month} ${year}

## Summary Statistics
- **Total Records:** ${stats.total_records}
- **Perfect Matches:** ${stats.perfect_matches} (${stats.percent_matched.toFixed(1)}%)
- **Mismatches:** ${stats.mismatches}
- **Missing Deals:** ${stats.missing_deals}
- **PPM Only:** ${stats.ppm_only}
- **Total Variance:** $${stats.total_variance.toFixed(2)}

## Recommendations
${stats.mismatches > 0 ? `* Review the ${stats.mismatches} mismatched records to identify pricing discrepancies\n` : ''}${stats.missing_deals > 0 ? `* Follow up on the ${stats.missing_deals} missing deals\n` : ''}${Math.abs(stats.total_variance) > 0.01 ? `* Address the total variance of $${stats.total_variance.toFixed(2)}\n` : ''}${stats.percent_matched < 90 ? `* Investigate why only ${stats.percent_matched.toFixed(1)}% of records matched perfectly\n` : ''}

## Top Variance Materials
| Material | Variance | Issue |
|----------|----------|-------|
${results
    .sort((a, b) => Math.abs(b.VAR || 0) - Math.abs(a.VAR || 0))
    .slice(0, 5)
    .map(r => `| ${r.Material} | $${(r.VAR || 0).toFixed(2)} | ${r.Comment || 'None'} |`).join('\n')}

*This report was generated automatically by the Dispute Analysis Tool.*
        `;
    } else {
        // Plain text
        return `
DISPUTE ANALYSIS REPORT
Generated: ${currentDate}
Filters: Market: ${market}, Brand: ${brand}, Period: ${month} ${year}

SUMMARY STATISTICS
-----------------
Total Records: ${stats.total_records}
Perfect Matches: ${stats.perfect_matches} (${stats.percent_matched.toFixed(1)}%)
Mismatches: ${stats.mismatches}
Missing Deals: ${stats.missing_deals}
PPM Only: ${stats.ppm_only}
Total Variance: $${stats.total_variance.toFixed(2)}

RECOMMENDATIONS
--------------
${stats.mismatches > 0 ? `- Review the ${stats.mismatches} mismatched records to identify pricing discrepancies\n` : ''}${stats.missing_deals > 0 ? `- Follow up on the ${stats.missing_deals} missing deals\n` : ''}${Math.abs(stats.total_variance) > 0.01 ? `- Address the total variance of $${stats.total_variance.toFixed(2)}\n` : ''}${stats.percent_matched < 90 ? `- Investigate why only ${stats.percent_matched.toFixed(1)}% of records matched perfectly\n` : ''}

TOP VARIANCE MATERIALS
---------------------
${results
    .sort((a, b) => Math.abs(b.VAR || 0) - Math.abs(a.VAR || 0))
    .slice(0, 5)
    .map(r => `Material: ${r.Material}, Variance: $${(r.VAR || 0).toFixed(2)}, Issue: ${r.Comment || 'None'}`).join('\n')}

This report was generated automatically by the Dispute Analysis Tool.
        `;
    }
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
 * Clear all stored data and return to home page
 */
function clearAllData() {
    if (confirm('Are you sure you want to clear all analysis data? This action cannot be undone.')) {
        localStorage.removeItem('disputeAnalysisData');
        window.location.href = 'index.html';
    }
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
 * Show an alert message
 */
function showAlert(message, type) {
    // Create alert element
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.setAttribute('role', 'alert');
    alertElement.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insert at top of page
    const container = document.querySelector('.container');
    container.insertBefore(alertElement, container.firstChild);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        const bsAlert = bootstrap.Alert.getOrCreateInstance(alertElement);
        bsAlert.close();
    }, 5000);
}
