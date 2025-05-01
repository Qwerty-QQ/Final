import React, { useState, useEffect } from 'react';
import { useCSVReader } from 'react-papaparse';
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import './RecordsPage.css';

const RecordsPage = () => {
  const { CSVReader } = useCSVReader();
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch records from Firestore
  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      const querySnapshot = await getDocs(collection(db, "members"));
      const recordsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecords(recordsList);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching records:", error);
      setIsLoading(false);
    }
  };

  // Handle CSV upload and save records to Firestore
  const handleUpload = async (results) => {
    const uploadedRecords = results.data.map((row) => ({
      name: row[0],
      contactInfo: row[1],
      address: row[2],
      amount: row[3],
    }));

    try {
      // Upload each record to Firestore
      const recordsRef = collection(db, "members"); // Change "members" to your collection name
      for (const record of uploadedRecords) {
        await addDoc(recordsRef, record);
      }

      // After upload, fetch latest records
      fetchRecords();
    } catch (error) {
      console.error("Error uploading records:", error);
    }
  };

  // Fetch records when page loads
  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div className="records-page">
      <div className="upload-section">
        <h3>Upload Records</h3>
        <CSVReader onUploadAccepted={handleUpload}>
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
        {isLoading ? (
          <p>Loading records...</p>
        ) : records.length > 0 ? (
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
                  <td>{record.lat}</td>
                  <td>{record.lon}</td>
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
