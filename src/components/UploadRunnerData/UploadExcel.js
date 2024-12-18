
import React, { useState, useEffect } from 'react';
import { Modal, Button, Dropdown } from 'react-bootstrap';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { baseUrl } from '../../apiConfig';
import BlockingLoader from "../Common/Loader";
import ToastComponent from "../Common/Toast";
import BootstrapTable from 'react-bootstrap-table-next';
import paginationFactory, { PaginationProvider, PaginationListStandalone } from 'react-bootstrap-table2-paginator';
const UploadExcel = ({ slug }) => {
  const [file, setFile] = useState(null);
  const [excelData, setExcelData] = useState([]); 
  const [excelColumns, setExcelColumns] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("");
  const [dbColumns, setDbColumns] = useState([]);
  const [labelMappings, setLabelMappings] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
const [loading, setLoading] = useState(false);
const columns = excelColumns.map((col) => ({
  dataField: col,
  text: col,
  sort: true,
  style: {
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  },
  headerStyle: {
    whiteSpace: "nowrap",
    textAlign: "center",
  },
}));

  useEffect(() => {
    const fetchColumnNames = async () => {
      try {
        const response = await axios.get(`${baseUrl}events/get-column-names-runnerdata`);
        setDbColumns(response.data.columns);
      } catch (error) {
        console.error("Error fetching column names:", error);
        setError("Error fetching column names.");
      }
    };

    fetchColumnNames();
  }, []);

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];

      const initialMappings = {};
      headers.forEach((excelColumn) => {
        const matchedDbColumn = dbColumns.find(
          (dbColumn) => dbColumn.toLowerCase() === excelColumn.toLowerCase()
        );
        if (matchedDbColumn) {
          initialMappings[excelColumn] = matchedDbColumn;
        }
      });
      setLabelMappings(initialMappings);
      setExcelColumns(headers);
      setExcelData(jsonData);
      setShowModal(true);
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleMappingChange = (excelColumn, selectedDbColumn) => {
    setLabelMappings((prev) => ({
      ...prev,
      [excelColumn]: selectedDbColumn,
    }));
  };

  const handleSubmit = async () => {
    if (Object.keys(labelMappings).length === 0) {
      setError("Please map the columns first.");
      setTimeout(() => setError(''), 2000);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("columnMappings", JSON.stringify(labelMappings));

    try {
      setLoading(true);
      const response = await axios.post(`${baseUrl}events/upload-runnerdata?slug=${slug}`, formData);
      console.log(response.data);
      setToastMessage("Runner data uploaded successfully!");
      setToastVariant("success");
      setShowToast(true);
      setShowModal(false);
    } catch (error) {
      setError(error.response.data.error ||"An error occurred while uploading the data.");
      setToastMessage(
        error.response?.data?.error ||
          "An error occurred while uploading the data."
      );
      setToastVariant("danger");
      console.error(error);
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="row justify-content-center">
        <div className="col-md-3 mt-4">
          <label className="text-16 fw-bold text-light-1 mb-2">Upload Runner Data</label>
          <input type="file" className="form-control" onChange={handleFileUpload} />
        </div>
  
      </div>
      <ToastComponent
  showToast={showToast}
  toastHeader="Upload Excel"
  setShowToast={setShowToast}
  toastMessage={toastMessage}
  toastVariant={toastVariant}
/>
{excelData.length > 0 && (
        <div className="mt-4">
          <h4>Preview</h4>
          <PaginationProvider
       pagination={ paginationFactory({
         custom: true,
         sizePerPage:20,
totalSize: excelData?.length
       }) }
     >
       {
         ({
           paginationProps,
           paginationTableProps
         }) => (
           <div>
            <div style={{ overflowX:"auto", marginTop:"15px"}}>
             <PaginationListStandalone
               { ...paginationProps }
             />
             </div>
      <div
        style={{ maxHeight: "450px", overflowY: "auto" }}
        className="table-responsive pb-4"
      >
          <BootstrapTable
            keyField="id"
            data={excelData}
            columns={columns}
            {...paginationTableProps}
            striped
            hover
            condensed
          />
          </div>
      </div>
)
}
</PaginationProvider>
        </div>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Map Excel Columns to Database Columns</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger mx-auto">{error}</div>}
          {loading && <BlockingLoader />}
          <div className="row">
            {excelColumns.map((excelColumn, index) => (
              <div key={index} className="col-md-6">
                <label>{excelColumn}</label>
                <Dropdown
                  onSelect={(selectedDbColumn) =>
                    handleMappingChange(excelColumn, selectedDbColumn)
                  }
                >
                  <Dropdown.Toggle variant="success" id="dropdown-basic">
                    {labelMappings[excelColumn] || 'Select column'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {dbColumns
                      .filter(
                        (dbColumn) =>
                          !["id", "createdAt", "updatedAt", "qrCode", "eventId", "emailStatus", "whatsappStatus", "isDistributed"].includes(dbColumn) &&
                          !Object.values(labelMappings).includes(dbColumn)
                      )
                      .map((dbColumn, idx) => (
                        <Dropdown.Item key={idx} eventKey={dbColumn}>
                          {dbColumn}
                        </Dropdown.Item>
                      ))}
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Submit
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default UploadExcel;
