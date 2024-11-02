import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Report.css';

const Report = () => {
    const [reports, setReports] = useState([]);
    const [error, setError] = useState('');
    const [sortCriteria, setSortCriteria] = useState('report_count'); // Default to 'Number of Reports'
    const [sortDirection, setSortDirection] = useState('desc'); // Default to descending
    const navigate = useNavigate();

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await axios.get(`http://${process.env.REACT_APP_localhost}:5000/comments/reported`);
                setReports(response.data);
            } catch (error) {
                console.error('Error fetching report data:', error);
                setError('Error fetching report data. Please try again later.');
            }
        };

        fetchReports();
    }, []);

    // Function to sort reports based on criteria and direction
    const sortedReports = () => {
        const sorted = [...reports].sort((a, b) => {
            if (sortCriteria === 'report_count') {
                return sortDirection === 'desc' ? b.report_count - a.report_count : a.report_count - b.report_count;
            } else if (sortCriteria === 'latest_report_time') {
                const dateA = new Date(a.latest_report_time);
                const dateB = new Date(b.latest_report_time);
                return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
            }
            return 0;
        });
        return sorted;
    };

    const handleSortChange = (criteria) => {
        if (criteria === sortCriteria) {
            // Toggle sort direction if the same criteria is selected
            setSortDirection((prevDirection) => (prevDirection === 'asc' ? 'desc' : 'asc'));
        } else {
            // Set new sort criteria and default to descending
            setSortCriteria(criteria);
            setSortDirection('desc');
        }
    };

    return (
        <div className="report-container">
            <h2>Reported Comments</h2>
            {error && <p className="error-message">{error}</p>}

            {/* Sorting Controls */}
            <div className="sorting-controls">
                <button onClick={() => handleSortChange('report_count')}>
                    Sort by Number of Reports {sortCriteria === 'report_count' && (sortDirection === 'asc' ? '▲' : '▼')}
                </button>
                <button onClick={() => handleSortChange('latest_report_time')}>
                    Sort by Latest Report Time {sortCriteria === 'latest_report_time' && (sortDirection === 'asc' ? '▲' : '▼')}
                </button>
            </div>

            <table className="report-table">
                <thead>
                    <tr>
                        <th>Report ID</th>
                        <th>Comment ID</th>
                        <th>Comment Text</th>
                        <th>Number of Reports</th>
                        <th>Latest Report Time</th>
                        <th>Forum Link</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedReports().map((report) => (
                        <tr key={report.reportid}>
                            <td>{report.reportid}</td>
                            <td>{report.commentid}</td>
                            <td>{report.commenttext}</td>
                            <td>{report.report_count}</td>
                            <td>{report.latest_report_time}</td>
                            <td>
                                <button
                                    onClick={() => navigate(`/comments/${report.forumid}`)}
                                    className="btn link-button"
                                >
                                    View Forum
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Report;