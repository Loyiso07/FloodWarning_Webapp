import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

function History() {
    const [readings, setReadings] = useState([]);
    const [filteredReadings, setFilteredReadings] = useState([]);
    const [bridges, setBridges] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [selectedBridge, setSelectedBridge] = useState('');
    const [dateRange, setDateRange] = useState('24h'); // 24h, 7d, 30d, all
    const [selectedStatus, setSelectedStatus] = useState('all'); // all, normal, warning, danger
    
    // Stats
    const [stats, setStats] = useState({
        avgWaterLevel: 0,
        maxWaterLevel: 0,
        avgVibration: 0,
        maxVibration: 0,
        totalAlerts: 0
    });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [readings, selectedBridge, dateRange, selectedStatus]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [readingsRes, bridgesRes] = await Promise.all([
                axios.get(`${API_URL}/api/readings?limit=1000`, { headers }),
                axios.get(`${API_URL}/api/bridges`, { headers })
            ]);

            setReadings(readingsRes.data);
            setBridges(bridgesRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...readings];

        // Filter by bridge
        if (selectedBridge) {
            filtered = filtered.filter(r => r.bridge_id === parseInt(selectedBridge));
        }

        // Filter by status
        if (selectedStatus !== 'all') {
            filtered = filtered.filter(r => r.alert_level === selectedStatus);
        }

        // Filter by date range
        if (dateRange !== 'all') {
            const now = new Date();
            const ranges = {
                '24h': 24 * 60 * 60 * 1000,
                '7d': 7 * 24 * 60 * 60 * 1000,
                '30d': 30 * 24 * 60 * 60 * 1000
            };
            const cutoff = new Date(now - ranges[dateRange]);
            filtered = filtered.filter(r => new Date(r.timestamp) >= cutoff);
        }

        // Sort by timestamp (oldest first for charts)
        filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        setFilteredReadings(filtered);
        calculateStats(filtered);
    };

    const calculateStats = (data) => {
        if (data.length === 0) {
            setStats({
                avgWaterLevel: 0,
                maxWaterLevel: 0,
                avgVibration: 0,
                maxVibration: 0,
                totalAlerts: 0
            });
            return;
        }

        const waterLevels = data.map(r => parseFloat(r.water_level_cm) || 0);
        const vibrations = data.map(r => parseFloat(r.vibration_g) || 0);

        setStats({
            avgWaterLevel: (waterLevels.reduce((a, b) => a + b, 0) / waterLevels.length).toFixed(1),
            maxWaterLevel: Math.max(...waterLevels).toFixed(1),
            avgVibration: (vibrations.reduce((a, b) => a + b, 0) / vibrations.length).toFixed(2),
            maxVibration: Math.max(...vibrations).toFixed(2),
            totalAlerts: data.filter(r => r.alert_level !== 'normal').length
        });
    };

    // Chart data
    const getLineChartData = () => {
        // Sample data if too many points (max 50 for readability)
        let chartData = filteredReadings;
        if (chartData.length > 50) {
            const step = Math.ceil(chartData.length / 50);
            chartData = chartData.filter((_, i) => i % step === 0);
        }

        return {
            labels: chartData.map(r => new Date(r.timestamp).toLocaleTimeString('en-ZA', { 
                hour: '2-digit', 
                minute: '2-digit',
                day: dateRange === '24h' ? undefined : '2-digit',
                month: dateRange === '24h' ? undefined : 'short'
            })),
            datasets: [
                {
                    label: 'Water Level (cm)',
                    data: chartData.map(r => parseFloat(r.water_level_cm)),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    fill: true,
                    tension: 0.3,
                    yAxisID: 'y'
                },
                {
                    label: 'Vibration (g)',
                    data: chartData.map(r => parseFloat(r.vibration_g)),
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    fill: true,
                    tension: 0.3,
                    yAxisID: 'y1'
                }
            ]
        };
    };

    const getStatusChartData = () => {
        const normal = filteredReadings.filter(r => r.alert_level === 'normal').length;
        const warning = filteredReadings.filter(r => r.alert_level === 'warning').length;
        const danger = filteredReadings.filter(r => r.alert_level === 'danger').length;

        return {
            labels: ['Normal', 'Warning', 'Danger'],
            datasets: [{
                label: 'Readings by Status',
                data: [normal, warning, danger],
                backgroundColor: [
                    'rgba(72, 187, 120, 0.7)',
                    'rgba(237, 137, 54, 0.7)',
                    'rgba(229, 62, 62, 0.7)'
                ],
                borderColor: [
                    'rgba(72, 187, 120, 1)',
                    'rgba(237, 137, 54, 1)',
                    'rgba(229, 62, 62, 1)'
                ],
                borderWidth: 1
            }]
        };
    };

    const getHourlyChartData = () => {
        // Group readings by hour
        const hourBuckets = {};
        filteredReadings.forEach(r => {
            const hour = new Date(r.timestamp).getHours();
            if (!hourBuckets[hour]) {
                hourBuckets[hour] = 0;
            }
            hourBuckets[hour]++;
        });

        const hours = Array.from({ length: 24 }, (_, i) => i);
        const counts = hours.map(h => hourBuckets[h] || 0);

        return {
            labels: hours.map(h => `${h.toString().padStart(2, '0')}:00`),
            datasets: [{
                label: 'Readings per Hour',
                data: counts,
                backgroundColor: 'rgba(102, 126, 234, 0.7)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1
            }]
        };
    };

    // Export to CSV
    const exportToCSV = () => {
        if (filteredReadings.length === 0) {
            alert('No data to export');
            return;
        }

        // Create CSV content
        const headers = ['ID', 'Bridge', 'Code', 'Water Level (cm)', 'Vibration (g)', 'Status', 'Barrier 1', 'Barrier 2', 'Buzzer', 'Timestamp'];
        const rows = filteredReadings.map(r => [
            r.id,
            r.bridge_name,
            r.bridge_code,
            r.water_level_cm,
            r.vibration_g,
            r.alert_level,
            r.barrier1_status ? 'Closed' : 'Open',
            r.barrier2_status ? 'Closed' : 'Open',
            r.buzzer_status ? 'On' : 'Off',
            new Date(r.timestamp).toLocaleString('en-ZA')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `flood_warning_readings_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Export summary as text report
    const exportSummary = () => {
        const bridgeName = selectedBridge 
            ? bridges.find(b => b.id === parseInt(selectedBridge))?.name 
            : 'All Bridges';
        
        const report = `
FLOOD WARNING SYSTEM - HISTORICAL REPORT
=========================================
Generated: ${new Date().toLocaleString('en-ZA')}
Bridge: ${bridgeName}
Period: ${dateRange === '24h' ? 'Last 24 Hours' : dateRange === '7d' ? 'Last 7 Days' : dateRange === '30d' ? 'Last 30 Days' : 'All Time'}
Status Filter: ${selectedStatus === 'all' ? 'All' : selectedStatus}

SUMMARY STATISTICS
------------------
Total Readings: ${filteredReadings.length}
Average Water Level: ${stats.avgWaterLevel} cm
Maximum Water Level: ${stats.maxWaterLevel} cm
Average Vibration: ${stats.avgVibration} g
Maximum Vibration: ${stats.maxVibration} g
Total Alerts: ${stats.totalAlerts}
  - Normal: ${filteredReadings.filter(r => r.alert_level === 'normal').length}
  - Warning: ${filteredReadings.filter(r => r.alert_level === 'warning').length}
  - Danger: ${filteredReadings.filter(r => r.alert_level === 'danger').length}

RECENT READINGS (Last 20)
-------------------------
${filteredReadings.slice(-20).reverse().map(r => 
    `${new Date(r.timestamp).toLocaleString('en-ZA')} | ${r.bridge_name} | ${r.water_level_cm}cm | ${r.vibration_g}g | ${r.alert_level.toUpperCase()}`
).join('\n')}

---
End of Report
        `.trim();

        const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `flood_warning_report_${new Date().toISOString().split('T')[0]}.txt`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="loading">Loading historical data...</div>;

    return (
        <div className="page history-page">
            <div className="page-header">
                <h1>📊 History & Analytics</h1>
                <div className="export-actions">
                    <button onClick={exportToCSV} className="btn-export-csv">
                        📥 Export CSV
                    </button>
                    <button onClick={exportSummary} className="btn-export-report">
                        📄 Export Report
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="history-filters">
                <div className="filter-group">
                    <label>Bridge:</label>
                    <select 
                        value={selectedBridge} 
                        onChange={(e) => setSelectedBridge(e.target.value)}
                    >
                        <option value="">All Bridges</option>
                        {bridges.map(b => (
                            <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Period:</label>
                    <select 
                        value={dateRange} 
                        onChange={(e) => setDateRange(e.target.value)}
                    >
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="all">All Time</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Status:</label>
                    <select 
                        value={selectedStatus} 
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="normal">Normal</option>
                        <option value="warning">Warning</option>
                        <option value="danger">Danger</option>
                    </select>
                </div>

                <div className="filter-info">
                    <span>{filteredReadings.length} readings</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="history-stats">
                <div className="h-stat-card">
                    <span className="h-stat-label">Avg Water Level</span>
                    <span className="h-stat-value">{stats.avgWaterLevel}cm</span>
                </div>
                <div className="h-stat-card">
                    <span className="h-stat-label">Max Water Level</span>
                    <span className="h-stat-value danger-text">{stats.maxWaterLevel}cm</span>
                </div>
                <div className="h-stat-card">
                    <span className="h-stat-label">Avg Vibration</span>
                    <span className="h-stat-value">{stats.avgVibration}g</span>
                </div>
                <div className="h-stat-card">
                    <span className="h-stat-label">Max Vibration</span>
                    <span className="h-stat-value danger-text">{stats.maxVibration}g</span>
                </div>
                <div className="h-stat-card">
                    <span className="h-stat-label">Total Alerts</span>
                    <span className="h-stat-value warning-text">{stats.totalAlerts}</span>
                </div>
            </div>

            {/* Charts */}
            {filteredReadings.length === 0 ? (
                <div className="no-data">No data available for the selected filters</div>
            ) : (
                <>
                    {/* Line Chart - Time Series */}
                    <div className="chart-container">
                        <h2>📈 Water Level & Vibration Over Time</h2>
                        <div className="chart-wrapper">
                            <Line 
                                data={getLineChartData()} 
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    interaction: {
                                        mode: 'index',
                                        intersect: false,
                                    },
                                    plugins: {
                                        legend: {
                                            position: 'top',
                                        },
                                        tooltip: {
                                            backgroundColor: 'rgba(0,0,0,0.8)',
                                        }
                                    },
                                    scales: {
                                        y: {
                                            type: 'linear',
                                            display: true,
                                            position: 'left',
                                            title: {
                                                display: true,
                                                text: 'Water Level (cm)'
                                            }
                                        },
                                        y1: {
                                            type: 'linear',
                                            display: true,
                                            position: 'right',
                                            title: {
                                                display: true,
                                                text: 'Vibration (g)'
                                            },
                                            grid: {
                                                drawOnChartArea: false,
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Two charts side by side */}
                    <div className="charts-row">
                        <div className="chart-container half">
                            <h2>📊 Status Distribution</h2>
                            <div className="chart-wrapper small">
                                <Bar 
                                    data={getStatusChartData()} 
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false }
                                        },
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                title: {
                                                    display: true,
                                                    text: 'Count'
                                                }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="chart-container half">
                            <h2>🕐 Readings by Hour of Day</h2>
                            <div className="chart-wrapper small">
                                <Bar 
                                    data={getHourlyChartData()} 
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false }
                                        },
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                title: {
                                                    display: true,
                                                    text: 'Count'
                                                }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Data Table Preview */}
                    <div className="chart-container">
                        <div className="table-header">
                            <h2>📋 Recent Readings Preview</h2>
                            <span className="table-count">Showing latest 10 of {filteredReadings.length}</span>
                        </div>
                        <div className="table-scroll">
                            <table className="history-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Bridge</th>
                                        <th>Water Level</th>
                                        <th>Vibration</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredReadings.slice(-10).reverse().map(r => (
                                        <tr key={r.id}>
                                            <td>{new Date(r.timestamp).toLocaleString('en-ZA')}</td>
                                            <td>{r.bridge_name}</td>
                                            <td>{r.water_level_cm}cm</td>
                                            <td>{r.vibration_g}g</td>
                                            <td>
                                                <span className={`status-${r.alert_level}`}>
                                                    {r.alert_level}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default History;