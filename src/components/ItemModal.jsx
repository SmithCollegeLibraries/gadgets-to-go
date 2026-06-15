import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Row,
  Col,
  Badge,
  Table,
  Spinner
} from 'reactstrap';
import { branches } from '../data/branches';

const ItemModal = ({ isOpen, toggle, item }) => {
  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const baseUrl = 'https://libtools2.smith.edu/gadgets-to-go/backend/web/api';

  useEffect(() => {
    if (item && item.folio_id) {
      setLoading(true);
      fetch(`${baseUrl}/inventory/get-folio?id=${item.folio_id}`)
        .then((response) => response.json())
        .then((data) => setItemData(data))
        .catch((error) => console.error('Error fetching item data:', error))
        .finally(() => setLoading(false));
    }
  }, [item]);

  if (!isOpen) return null;

  const getBranchName = (code) => {
    const b = branches.find(br => br.code === code);
    if (!b) return code;
    return b.name.replace(/^[A-Z]{2}\s+/, '');
  };

  const getSchoolName = (code) => {
    const mapping = {
      'AMH': 'Amherst College',
      'HMC': 'Hampshire College',
      'MHC': 'Mount Holyoke College',
      'SMC': 'Smith College',
      'UMA': 'University of Massachusetts',
    };
    return mapping[code] || code;
  };

  const renderContent = () => {
    if (loading) {
      return <div className="text-center py-5"><Spinner color="primary" /></div>;
    }

    if (!itemData) {
      return <div className="text-center py-5 text-muted">No details available.</div>;
    }

    let { holding } = itemData;
    if (!Array.isArray(holding)) holding = holding ? [holding] : [];

    // Sort holdings: Available first, then Checked out, then Unavailable
    holding.sort((a, b) => {
      const sA = a.status.toLowerCase();
      const sB = b.status.toLowerCase();
      const isAvailableA = sA === 'available';
      const isAvailableB = sB === 'available';
      const isCheckedOutA = sA === 'checked out';
      const isCheckedOutB = sB === 'checked out';
      
      if (isAvailableA && !isAvailableB) return -1;
      if (!isAvailableA && isAvailableB) return 1;
      if (isCheckedOutA && !isCheckedOutB && !isAvailableB) return -1;
      if (!isCheckedOutA && isCheckedOutB && !isAvailableA) return 1;
      return 0;
    });

    return (
      <>
        <Row className="mb-4">
          <Col md={5} className="mb-3 mb-md-0">
            <div className="bg-light rounded d-flex align-items-center justify-content-center overflow-hidden border" style={{ aspectRatio: '4/3' }}>
              <img
                src={`${baseUrl}/inventory/get-image-data?id=${item.id}`}
                alt={`Image of ${item.title}`}
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '1rem' }}
              />
            </div>
          </Col>
          <Col md={7}>
            {/* Visually hidden h2 for screen readers (modal title is h2 in ModalHeader) */}
            <h2 className="visually-hidden">Item Details</h2>
            <h3 className="fw-bold mb-3">{item.title}</h3>
            {(Array.isArray(item.branches) ? item.branches : (item.branch ? [item.branch] : [])).length > 0 && (
              <div className="mb-3">
                {(Array.isArray(item.branches) ? item.branches : (item.branch ? [item.branch] : [])).map((branchCode, idx) => (
                  <Badge key={idx} color="dark" className="text-white px-3 py-2 me-2" pill aria-label={`Available at ${getBranchName(branchCode)}`}>
                    <i className="bi bi-geo-alt-fill me-1" aria-hidden="true"></i> {getBranchName(branchCode)}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-dark lead fs-6" dangerouslySetInnerHTML={{ __html: item.description }}></p>

            <div className="mt-4 p-3 bg-light rounded small border">
              <Row className="g-2">
                <Col sm={6}><strong>System ID:</strong> <span className="text-dark font-monospace">{item.folio_id}</span></Col>
                <Col sm={6}><strong>Owner:</strong> <span className="text-dark">{getSchoolName(item.owner)}</span></Col>
                {holding.length > 0 && <Col sm={12}><strong>Primary Location:</strong> <span className="text-dark">{holding[0].location}</span></Col>}
              </Row>
            </div>
          </Col>
        </Row>

        <h4 className="border-bottom pb-2 mb-3">Availability & Holdings</h4>
        {holding.length > 0 ? (
          <div className="table-responsive">
            <Table hover bordered className="align-middle" aria-label="Item availability and holdings information">
              <thead className="bg-light text-dark small text-uppercase">
                <tr>
                  <th scope="col">Status</th>
                  <th scope="col">Call Number</th>
                  <th scope="col">Copy</th>
                  <th scope="col">Loan Type</th>
                  <th scope="col">Barcode</th>
                </tr>
              </thead>
              <tbody>
                {holding.map((record) => {
                  const isAvailable = record.status.toLowerCase() === 'available';
                  const isCheckedOut = record.status.toLowerCase() === 'checked out';
                  const isUnavailable = !isAvailable && !isCheckedOut;
                  return (
                    <tr key={record.id} className={isUnavailable ? 'table-secondary' : !isAvailable ? 'table-light text-dark' : ''}>
                      <td>
                        <Badge 
                          color={isAvailable ? 'success' : isCheckedOut ? 'danger' : 'dark'} 
                          pill
                          aria-label={isAvailable ? 'Available for checkout' : isCheckedOut ? 'Currently checked out' : `Unavailable - ${record.status}`}
                        >
                          {isAvailable ? record.status : isCheckedOut ? record.status : `Unavailable - ${record.status}`}
                        </Badge>
                        {isCheckedOut && record.dueDate && (() => {
                          const dueDate = new Date(record.dueDate);
                          const now = new Date();
                          const totalHours = Math.round((dueDate - now) / (1000 * 60 * 60));
                          const days = Math.floor(totalHours / 24);
                          const hours = totalHours % 24;
                          
                          let timeRemaining;
                          if (days > 0) {
                            timeRemaining = hours > 0 ? `${days}d ${hours}h` : `${days}d`;
                          } else {
                            timeRemaining = `${totalHours}h`;
                          }
                          
                          const formattedDateTime = dueDate.toLocaleString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: '2-digit',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          });
                          return (
                            <div className="small text-danger fw-bold mt-1" aria-label={`Due: ${formattedDateTime} (${timeRemaining})`}>
                              Due: {formattedDateTime} ({timeRemaining})
                            </div>
                          );
                        })()}
                      </td>
                      <td>{record.callNumber || '-'}</td>
                      <td>{record.itemCopyNumber || '-'}</td>
                      <td>{record.permanentLoanType}</td>
                      <td className="font-monospace small">{record.barcode}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        ) : (
          <div className="alert alert-warning">No holding information available from FOLIO.</div>
        )}
      </>
    );
  };

  return (
    <Modal 
      isOpen={isOpen} 
      toggle={toggle} 
      size="xl" 
      centered 
      scrollable
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <ModalHeader toggle={toggle} className="bg-light" id="modal-title">
        <span className="visually-hidden">Item Details: </span>{item.title}
      </ModalHeader>
      <ModalBody className="p-4" id="modal-description">
        {renderContent()}
      </ModalBody>
      <ModalFooter className="bg-light">
        <Button color="secondary" onClick={toggle}>Close</Button>
      </ModalFooter>
    </Modal>
  );
};

ItemModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  item: PropTypes.object
};

export default ItemModal;
