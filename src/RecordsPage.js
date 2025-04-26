import React, { useState } from 'react';
import { useCSVReader } from 'react-papaparse';
import './RecordsPage.css';

const RecordsPage = () => {
  const { CSVReader } = useCSVReader();
  const [records, setRecords] = useState([]);

  const handleUpload = (results) => {
    const uploadedRecords = results.data.map((row) => ({
      name: row[0],
      contactInfo: row[1],
      address: row[2],
      amount: row[3],
    }));
    setRecords(uploadedRecords);
  };

  return (
    <div className="records-page">
      <div className="upload-section">
        <h3>Upload Records</h3>
        <CSVReader
          onUploadAccepted={handleUpload}
        >
          {({ getRootProps, acceptedFile }) => (
            <div>
              <button type="button" {...getRootProps()} className="btn upload-btn">
                {acceptedFile ? acceptedFile.name : 'Browse CSV'}
              </button>
            </div>
          )}
        </CSVReader>
      </div>
      <div className="table-section">
        <h3>Uploaded Records</h3>
        {records.length > 0 ? (
          <table className="records-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact Info</th>
                <th>Address</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr key={index}>
                  <td>{record.name}</td>
                  <td>{record.contactInfo}</td>
                  <td>{record.address}</td>
                  <td>{record.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No records uploaded yet.</p>
        )}
      </div>
    </div>
  );
};

export default RecordsPage;
