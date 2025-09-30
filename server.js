const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
}));

// Serve static files
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set up session data storage (simple in-memory for demo)
const sessions = {};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

app.get('/analyzer', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'analyzer.html'));
});

// Handle file uploads
app.post('/upload', (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files were uploaded.'
      });
    }
    
    const requiredFiles = ['billback', 'item_ref', 'ppm', 'states'];
    const uploadedFiles = {};
    const sessionId = uuidv4();
    
    // Process each uploaded file
    for (const fileType of requiredFiles) {
      if (!req.files[fileType]) {
        return res.status(400).json({
          success: false,
          message: `Missing file: ${fileType}`
        });
      }
      
      const file = req.files[fileType];
      const safeFilename = `${fileType}.xlsx`;
      const uploadPath = path.join(uploadsDir, sessionId, safeFilename);
      
      // Create session directory if it doesn't exist
      const sessionDir = path.join(uploadsDir, sessionId);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      
      // Move the file
      file.mv(uploadPath);
      uploadedFiles[fileType] = uploadPath;
    }
    
    // Store session data
    sessions[sessionId] = {
      uploadedFiles,
      filterOptions: {
        markets: ['FL', 'TX', 'GA', 'CA'],
        brands_pk: ['Brand A 6pk', 'Brand B 12pk', 'Brand C 24pk'],
        years: [2023, 2024, 2025],
        months: ["January", "February", "March", "April", "May", "June", 
                "July", "August", "September", "October", "November", "December"]
      }
    };
    
    // Set session cookie
    res.cookie('sessionId', sessionId);
    
    return res.status(200).json({
      success: true,
      message: 'Files uploaded successfully',
      sessionId,
      redirect: '/analyzer'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error uploading files: ${error.message}`
    });
  }
});

// Get filter options for analyzer page
app.get('/filter-options', (req, res) => {
  const sessionId = req.query.sessionId;
  
  if (!sessionId || !sessions[sessionId]) {
    return res.status(400).json({
      success: false,
      message: 'No valid session found. Please upload files first.'
    });
  }
  
  return res.status(200).json({
    success: true,
    filterOptions: sessions[sessionId].filterOptions
  });
});

// Mock analyze endpoint
app.post('/analyze', (req, res) => {
  const sessionId = req.body.sessionId;
  const { market, brand, year, month } = req.body;
  
  if (!sessionId || !sessions[sessionId]) {
    return res.status(400).json({
      success: false,
      error: 'No valid session found. Please upload files first.'
    });
  }
  
  if (!market || !brand || !year || !month) {
    return res.status(400).json({
      success: false,
      error: 'Invalid selection. Please select all filter options.'
    });
  }
  
  // For demonstration, return mock data
  // In a real implementation, this would process the Excel files using a library like exceljs
  
  // Mock statistics
  const stats = {
    total_records: 150,
    perfect_matches: 95,
    mismatches: 35,
    missing_deals: 15,
    ppm_only: 5,
    total_variance: 12750.50,
    absolute_variance: 14500.75,
    percent_matched: 63.3
  };
  
  // Mock result data for table
  const resultData = Array(stats.total_records).fill().map((_, i) => {
    const rowType = i % 4;
    let comment = '';
    
    if (rowType === 1) {
      comment = 'Price mismatch';
    } else if (rowType === 2) {
      comment = 'Missing Deal';
    } else if (rowType === 3) {
      comment = 'PPM Only';
    }
    
    return {
      Material: `100${i.toString().padStart(4, '0')}`,
      'At price': `${(Math.random() * 10 + 5).toFixed(2)}`,
      'Case in Part': `${Math.floor(Math.random() * 20 + 10)}`,
      'Part Amount': `${(Math.random() * 100 + 50).toFixed(2)}`,
      'Extended Part': `${(Math.random() * 1000 + 500).toFixed(2)}`,
      'Net$': `${(Math.random() * 10 + 5).toFixed(2)}`,
      'Quantity': `${Math.floor(Math.random() * 100 + 20)}`,
      'Unit Rebate$': `${(Math.random() * 2 + 1).toFixed(2)}`,
      'Rebate': `${(Math.random() * 200 + 100).toFixed(2)}`,
      'VAR': `${(Math.random() * 100 - 50).toFixed(2)}`,
      'Comment': comment
    };
  });
  
  // Mock visualizations
  const visualizations = {
    match_distribution: {
      data: [
        {
          values: [stats.perfect_matches, stats.mismatches, stats.missing_deals, stats.ppm_only],
          labels: ['Perfect Match', 'Mismatches', 'Missing Deals', 'PPM Only'],
          type: 'pie',
          marker: {
            colors: ['#28a745', '#ffc107', '#dc3545', '#ff7f50']
          }
        }
      ],
      layout: {
        title: 'Distribution of Match Types',
        height: 400,
        margin: { t: 50, b: 20, l: 20, r: 20 }
      }
    },
    variance_by_type: {
      data: [
        {
          x: ['Perfect Match', 'Mismatches', 'Missing Deals', 'PPM Only'],
          y: [2500.25, 7500.50, 1500.75, 1250.00],
          type: 'bar',
          marker: {
            color: ['#28a745', '#ffc107', '#dc3545', '#ff7f50']
          }
        }
      ],
      layout: {
        title: 'Variance by Match Type',
        height: 400,
        margin: { t: 50, b: 50, l: 50, r: 20 }
      }
    },
    // Additional mock visualizations would go here
    top_materials: {
      data: [
        {
          y: ['Material 1', 'Material 2', 'Material 3', 'Material 4', 'Material 5'],
          x: [3200, 2500, 1800, 1200, 950],
          type: 'bar',
          orientation: 'h',
          marker: {
            color: '#3c6e71'
          }
        }
      ],
      layout: {
        title: 'Top Materials by Variance',
        height: 400,
        margin: { t: 50, b: 50, l: 120, r: 20 }
      }
    },
    billback_vs_ppm: {
      data: [
        {
          x: ['Material 1', 'Material 2', 'Material 3', 'Material 4', 'Material 5'],
          y: [3500, 2800, 2100, 1500, 1200],
          type: 'bar',
          name: 'Bill Back'
        },
        {
          x: ['Material 1', 'Material 2', 'Material 3', 'Material 4', 'Material 5'],
          y: [3200, 2500, 1800, 1200, 950],
          type: 'bar',
          name: 'PPM'
        }
      ],
      layout: {
        title: 'Bill Back vs PPM Comparison',
        height: 400,
        margin: { t: 50, b: 50, l: 50, r: 20 },
        barmode: 'group'
      }
    },
    variance_distribution: {
      data: [
        {
          x: Array(50).fill().map(() => Math.random() * 100 - 50),
          type: 'histogram',
          marker: {
            color: '#284b63'
          }
        }
      ],
      layout: {
        title: 'Variance Distribution',
        height: 400,
        margin: { t: 50, b: 50, l: 50, r: 20 },
        xaxis: { title: 'Variance' },
        yaxis: { title: 'Frequency' }
      }
    }
  };
  
  // Store results in session
  sessions[sessionId].analysisResults = resultData;
  sessions[sessionId].analysisStats = stats;
  
  return res.status(200).json({
    success: true,
    data: resultData,
    stats: stats,
    visualizations: visualizations
  });
});

// Mock report generation endpoint
app.post('/generate-report', (req, res) => {
  const sessionId = req.body.sessionId;
  const format = req.body.format || 'html';
  
  if (!sessionId || !sessions[sessionId]) {
    return res.status(400).json({
      success: false,
      error: 'No valid session found. Please run analysis first.'
    });
  }
  
  if (!sessions[sessionId].analysisResults) {
    return res.status(400).json({
      success: false,
      error: 'No analysis results found. Please run analysis first.'
    });
  }
  
  // Generate simple report content based on format
  let reportContent = '';
  const stats = sessions[sessionId].analysisStats;
  
  if (format === 'html') {
    reportContent = `
      <h2>Dispute Analysis Report</h2>
      <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
      
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
        <li>Review the ${stats.mismatches} mismatched records to identify pricing discrepancies</li>
        <li>Follow up on the ${stats.missing_deals} missing deals</li>
        <li>Address the total variance of $${stats.total_variance.toFixed(2)}</li>
      </ul>
      
      <p><em>This report was generated automatically by the Dispute Analysis Tool.</em></p>
    `;
  } else if (format === 'markdown') {
    reportContent = `
# Dispute Analysis Report
**Generated:** ${new Date().toLocaleString()}

## Summary Statistics
- **Total Records:** ${stats.total_records}
- **Perfect Matches:** ${stats.perfect_matches} (${stats.percent_matched.toFixed(1)}%)
- **Mismatches:** ${stats.mismatches}
- **Missing Deals:** ${stats.missing_deals}
- **PPM Only:** ${stats.ppm_only}
- **Total Variance:** $${stats.total_variance.toFixed(2)}

## Recommendations
* Review the ${stats.mismatches} mismatched records to identify pricing discrepancies
* Follow up on the ${stats.missing_deals} missing deals
* Address the total variance of $${stats.total_variance.toFixed(2)}

*This report was generated automatically by the Dispute Analysis Tool.*
    `;
  } else {
    reportContent = `
DISPUTE ANALYSIS REPORT
Generated: ${new Date().toLocaleString()}

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
- Review the ${stats.mismatches} mismatched records to identify pricing discrepancies
- Follow up on the ${stats.missing_deals} missing deals
- Address the total variance of $${stats.total_variance.toFixed(2)}

This report was generated automatically by the Dispute Analysis Tool.
    `;
  }
  
  return res.status(200).json({
    success: true,
    report: reportContent,
    format: format
  });
});

// Clear session
app.get('/clear', (req, res) => {
  const sessionId = req.query.sessionId;
  
  if (sessionId && sessions[sessionId]) {
    // Remove uploaded files
    const sessionDir = path.join(uploadsDir, sessionId);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
    
    // Delete session data
    delete sessions[sessionId];
  }
  
  // Redirect to home
  res.redirect('/');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
