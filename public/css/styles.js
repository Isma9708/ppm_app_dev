/* Main Styles for Dispute Analysis Tool */

:root {
    --primary: #3c6e71;
    --primary-dark: #284b63;
    --secondary: #d9d9d9;
    --accent: #f4a261;
    --success: #28a745;
    --warning: #ffc107;
    --danger: #dc3545;
    --light: #f8f9fa;
    --dark: #353535;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f8f9fa;
    color: #353535;
}

/* Navbar */
.navbar {
    background-color: var(--primary-dark);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.navbar-brand {
    font-weight: 600;
}

.nav-link {
    font-weight: 500;
}

/* Cards */
.card {
    border: none;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    margin-bottom: 1.5rem;
}

.card-header {
    background-color: var(--primary);
    border-bottom: none;
    border-radius: 8px 8px 0 0 !important;
    padding: 1rem 1.25rem;
}

.card-body {
    padding: 1.5rem;
}

/* Buttons */
.btn-primary {
    background-color: var(--primary);
    border-color: var(--primary);
}

.btn-primary:hover, .btn-primary:focus {
    background-color: var(--primary-dark);
    border-color: var(--primary-dark);
}

.btn-outline-primary {
    color: var(--primary);
    border-color: var(--primary);
}

.btn-outline-primary:hover {
    background-color: var(--primary);
    border-color: var(--primary);
}

/* File Upload Area */
.file-upload-area {
    border: 2px dashed #dee2e6;
    border-radius: 8px;
    transition: all 0.3s;
}

.file-upload-area:hover {
    border-color: var(--primary);
    background-color: rgba(60, 110, 113, 0.05);
}

.file-input {
    cursor: pointer;
}

/* Statistics Cards */
.stat-card {
    border-left: 4px solid var(--primary);
    transition: transform 0.2s;
}

.stat-card:hover {
    transform: translateY(-5px);
}

.border-left-primary {
    border-left-color: #4e73df;
}

.border-left-success {
    border-left-color: #1cc88a;
}

.border-left-warning {
    border-left-color: #f6c23e;
}

.border-left-info {
    border-left-color: #36b9cc;
}

/* Tables */
.table thead th {
    background-color: #f8f9fa;
    border-top: none;
    font-weight: 600;
}

.table-striped tbody tr:nth-of-type(odd) {
    background-color: rgba(60, 110, 113, 0.05);
}

/* Results Table Row Classes */
.perfect-match {
    background-color: rgba(40, 167, 69, 0.05) !important;
}

.mismatch {
    background-color: rgba(255, 193, 7, 0.05) !important;
}

.missing-deal {
    background-color: rgba(220, 53, 69, 0.05) !important;
}

.ppm-only {
    background-color: rgba(255, 127, 80, 0.05) !important;
}

.var-positive {
    color: #dc3545;
    font-weight: 600;
}

.var-negative {
    color: #28a745;
    font-weight: 600;
}

.variance-total {
    font-weight: 700;
}

/* Nav Pills */
.nav-pills .nav-link {
    color: var(--primary);
    border-radius: 4px;
    font-weight: 500;
}

.nav-pills .nav-link.active {
    background-color: var(--primary);
    color: white;
}

/* Charts */
.chart-container {
    height: 400px;
    margin-bottom: 1.5rem;
}

/* Loading Overlay */
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 255, 255, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.spinner-container {
    text-align: center;
    background-color: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
}

/* Footer */
.footer {
    background-color: #f8f9fa;
    padding: 1rem 0;
    margin-top: 3rem;
}

/* Alerts */
.alert-container {
    position: relative;
    z-index: 100;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .chart-container {
        height: 300px;
    }
}
