import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL ?? '/api/complaints';
const categories = ['Electricity', 'Plumbing', 'Water Supply', 'Internet', 'Housekeeping', 'Maintenance', 'Other'];
const priorities = ['Normal', 'High', 'Emergency'];
const statuses = ['Pending', 'In Progress', 'Resolved', 'Cancelled'];

interface ComplaintForm {
  residentName: string;
  roomNumber: string;
  contact: string;
  category: string;
  description: string;
  priority: string;
  additionalInfo: string;
}

interface Complaint extends ComplaintForm {
  id: number;
  status: string;
  date: string;
  updatedAt?: string;
}

interface EditForm extends ComplaintForm {
  status: string;
}

interface Filters {
  search: string;
  category: string;
  priority: string;
  status: string;
}

interface Message {
  text: string;
  type: 'success' | 'error';
}

const emptyFormData: ComplaintForm = {
  residentName: '',
  roomNumber: '',
  contact: '',
  category: '',
  priority: 'Normal',
  description: '',
  additionalInfo: '',
};

const emptyFilters: Filters = {
  search: '',
  category: '',
  priority: '',
  status: '',
};

const formatDate = (date: string) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsedDate);
};

function App() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [formData, setFormData] = useState<ComplaintForm>(emptyFormData);
  const [editData, setEditData] = useState<EditForm | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [message, setMessage] = useState<Message | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [modalMode, setModalMode] = useState<'details' | 'edit' | null>(null);

  const filteredComplaints = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    return complaints.filter((complaint) => {
      const searchableText = [
        complaint.residentName,
        complaint.roomNumber,
        complaint.contact,
        complaint.category,
        complaint.description,
        complaint.additionalInfo,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        (!searchTerm || searchableText.includes(searchTerm)) &&
        (!filters.category || complaint.category === filters.category) &&
        (!filters.priority || complaint.priority === filters.priority) &&
        (!filters.status || complaint.status === filters.status)
      );
    });
  }, [complaints, filters]);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const showMessage = useCallback((text: string, type: Message['type']) => {
    setMessage({ text, type });
    window.setTimeout(() => setMessage(null), 3500);
  }, []);

  const fetchComplaints = useCallback(async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data: unknown = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('The complaints API returned an invalid response.');
      }

      setComplaints(data as Complaint[]);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      showMessage('Unable to load complaints. Please check that the API is running.', 'error');
    }
  }, [showMessage]);

  useEffect(() => {
    void fetchComplaints();
  }, [fetchComplaints]);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const name = event.target.name as keyof ComplaintForm;
    setFormData((current) => ({ ...current, [name]: event.target.value }));
  };

  const handleEditInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const name = event.target.name as keyof EditForm;
    setEditData((current) => (current ? { ...current, [name]: event.target.value } : current));
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const name = event.target.name as keyof Filters;
    setFilters((current) => ({ ...current, [name]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      setFormData(emptyFormData);
      await fetchComplaints();
      showMessage('Your complaint has been submitted successfully.', 'success');
    } catch (error) {
      console.error('Error submitting complaint:', error);
      showMessage('We could not save your complaint. Please try again.', 'error');
    }
  };

  const openDetails = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/${id}`);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const complaint = (await response.json()) as Complaint;
      setSelectedComplaint(complaint);
      setModalMode('details');
    } catch (error) {
      console.error('Error loading complaint:', error);
      showMessage('Unable to load those complaint details.', 'error');
    }
  };

  const openEditor = (complaint: Complaint) => {
    setEditData({
      residentName: complaint.residentName,
      roomNumber: complaint.roomNumber,
      contact: complaint.contact ?? '',
      category: complaint.category,
      description: complaint.description,
      priority: complaint.priority,
      additionalInfo: complaint.additionalInfo ?? '',
      status: complaint.status,
    });
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedComplaint(null);
    setEditData(null);
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const response = await fetch(`${API_URL}/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const updatedComplaint = (await response.json()) as Complaint;
      setSelectedComplaint((current) => (current?.id === id ? updatedComplaint : current));
      await fetchComplaints();
      showMessage(`Complaint marked as ${status.toLowerCase()}.`, 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      showMessage('Unable to update the complaint status.', 'error');
    }
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedComplaint || !editData) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${selectedComplaint.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const updatedComplaint = (await response.json()) as Complaint;
      setSelectedComplaint(updatedComplaint);
      setModalMode('details');
      await fetchComplaints();
      showMessage('Complaint details updated.', 'success');
    } catch (error) {
      console.error('Error updating complaint:', error);
      showMessage('Unable to update the complaint. Please try again.', 'error');
    }
  };

  const deleteComplaint = async (complaint: Complaint) => {
    const action = complaint.status === 'Resolved' ? 'delete' : 'cancel';
    if (!window.confirm(`Are you sure you want to ${action} this complaint?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${complaint.id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      closeModal();
      await fetchComplaints();
      showMessage(`Complaint ${action}led successfully.`, 'success');
    } catch (error) {
      console.error('Error deleting complaint:', error);
      showMessage('Unable to remove the complaint.', 'error');
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="header-content">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              H
            </span>
            <div>
              <p className="eyebrow">Resident support desk</p>
              <h1>Apartment / PG Complaint Portal</h1>
              <p className="header-copy">A simpler way to keep your home running smoothly.</p>
            </div>
          </div>
          <div className="request-summary" aria-label={`${complaints.length} total requests`}>
            <span>Total requests</span>
            <strong>{complaints.length}</strong>
          </div>
        </div>
      </header>

      {message && (
        <p className={`feedback-toast feedback-toast-${message.type}`} role="status">
          {message.text}
        </p>
      )}

      <section className="content-grid" aria-label="Complaint management">
        <form className="panel complaint-form" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <p className="section-label">New request</p>
              <h2>What needs attention?</h2>
              <p>Share the details and the property team will be notified.</p>
            </div>
            <span className="panel-icon" aria-hidden="true">
              +
            </span>
          </div>

          <div className="form-fields">
            <label htmlFor="residentName">
              Resident name
              <input
                id="residentName"
                name="residentName"
                placeholder="e.g. Asha Sharma"
                value={formData.residentName}
                onChange={handleInputChange}
                required
              />
            </label>

            <label htmlFor="roomNumber">
              Room / flat number
              <input
                id="roomNumber"
                name="roomNumber"
                placeholder="e.g. B-204"
                value={formData.roomNumber}
                onChange={handleInputChange}
                required
              />
            </label>

            <label htmlFor="contact">
              Contact number
              <input
                id="contact"
                name="contact"
                type="tel"
                inputMode="tel"
                pattern="[0-9+() -]{7,20}"
                title="Enter a valid phone number"
                placeholder="e.g. +91 98765 43210"
                value={formData.contact}
                onChange={handleInputChange}
              />
            </label>

            <label htmlFor="category">
              Complaint category
              <select id="category" name="category" value={formData.category} onChange={handleInputChange} required>
                <option value="" disabled>
                  Select category
                </option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="priority">
              Priority / severity
              <select id="priority" name="priority" value={formData.priority} onChange={handleInputChange}>
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority} priority
                  </option>
                ))}
              </select>
            </label>

            <label className="full-width" htmlFor="description">
              Description
              <textarea
                id="description"
                name="description"
                placeholder="Briefly describe the issue and its location."
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                required
              />
            </label>

            <label className="full-width" htmlFor="additionalInfo">
              Additional information <span className="optional-label">Optional</span>
              <textarea
                id="additionalInfo"
                name="additionalInfo"
                placeholder="Add a preferred visit time, landmark, or any useful note."
                value={formData.additionalInfo}
                onChange={handleInputChange}
                rows={2}
              />
            </label>
          </div>

          <div className="form-footer">
            <p>All required details help us resolve your issue faster.</p>
            <button className="primary-button" type="submit">
              Submit Complaint <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>

        <section className="panel complaints-panel" aria-live="polite">
          <div className="panel-heading complaints-heading">
            <div>
              <p className="section-label">Request tracker</p>
              <h2>Recent complaints</h2>
              <p>Search, filter, and follow every maintenance update.</p>
            </div>
            <span className="count-badge">{filteredComplaints.length}</span>
          </div>

          <div className="filter-toolbar">
            <label className="search-field" htmlFor="complaintSearch">
              <span aria-hidden="true">⌕</span>
              <input
                id="complaintSearch"
                name="search"
                type="search"
                placeholder="Search by resident, room, or issue"
                value={filters.search}
                onChange={handleFilterChange}
              />
            </label>
            <div className="filter-controls">
              <select name="category" aria-label="Filter by category" value={filters.category} onChange={handleFilterChange}>
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select name="priority" aria-label="Filter by priority" value={filters.priority} onChange={handleFilterChange}>
                <option value="">All priorities</option>
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              <select name="status" aria-label="Filter by status" value={filters.status} onChange={handleFilterChange}>
                <option value="">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              {hasActiveFilters && (
                <button className="clear-filters" type="button" onClick={() => setFilters(emptyFilters)}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">
                {hasActiveFilters ? '⌕' : '✓'}
              </span>
              <h3>{hasActiveFilters ? 'No matching complaints' : 'All clear for now'}</h3>
              <p>
                {hasActiveFilters
                  ? 'Try changing or clearing your search and filters.'
                  : 'No complaints found. New requests will appear here.'}
              </p>
            </div>
          ) : (
            <ul className="complaints-list">
              {filteredComplaints.map((complaint) => (
                <li key={complaint.id} className="complaint-card">
                  <div className="complaint-heading">
                    <div>
                      <p className="complaint-id">Request #{String(complaint.id).padStart(3, '0')}</p>
                      <h3>
                        Room {complaint.roomNumber} <span>•</span> {complaint.category}
                      </h3>
                    </div>
                    <span className={`status status-${complaint.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {complaint.status}
                    </span>
                  </div>
                  <div className="complaint-meta">
                    <p>
                      <span>Resident</span>
                      {complaint.residentName}
                    </p>
                    <p>
                      <span>Priority</span>
                      <b className={`priority priority-${complaint.priority.toLowerCase()}`}>{complaint.priority}</b>
                    </p>
                    <p>
                      <span>Contact</span>
                      {complaint.contact || 'Not provided'}
                    </p>
                  </div>
                  <p className="complaint-description">{complaint.description}</p>
                  <p className="submitted-date">Submitted {formatDate(complaint.date)}</p>
                  <div className="complaint-actions">
                    <button className="view-button" type="button" onClick={() => void openDetails(complaint.id)}>
                      View details
                    </button>
                    {complaint.status !== 'Resolved' && complaint.status !== 'Cancelled' && (
                      <button
                        className="resolve-button"
                        type="button"
                        onClick={() => void updateStatus(complaint.id, 'Resolved')}
                      >
                        Mark Resolved
                      </button>
                    )}
                    <button className="delete-button" type="button" onClick={() => void deleteComplaint(complaint)}>
                      {complaint.status === 'Resolved' ? 'Delete' : 'Cancel'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>

      {selectedComplaint && modalMode === 'details' && (
        <div className="modal-backdrop" role="presentation">
          <section className="details-modal" role="dialog" aria-modal="true" aria-labelledby="details-title">
            <div className="modal-header">
              <div>
                <p className="section-label">Request #{String(selectedComplaint.id).padStart(3, '0')}</p>
                <h2 id="details-title">Complaint details</h2>
              </div>
              <button className="close-button" type="button" aria-label="Close details" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="details-status-row">
              <span className={`status status-${selectedComplaint.status.toLowerCase().replace(/\s+/g, '-')}`}>
                {selectedComplaint.status}
              </span>
              <span>Submitted {formatDate(selectedComplaint.date)}</span>
            </div>
            <dl className="details-grid">
              <div>
                <dt>Resident</dt>
                <dd>{selectedComplaint.residentName}</dd>
              </div>
              <div>
                <dt>Room / flat</dt>
                <dd>{selectedComplaint.roomNumber}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>{selectedComplaint.contact || 'Not provided'}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{selectedComplaint.category}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>{selectedComplaint.priority}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{formatDate(selectedComplaint.updatedAt ?? selectedComplaint.date)}</dd>
              </div>
              <div className="details-wide">
                <dt>Description</dt>
                <dd>{selectedComplaint.description}</dd>
              </div>
              {selectedComplaint.additionalInfo && (
                <div className="details-wide">
                  <dt>Additional information</dt>
                  <dd>{selectedComplaint.additionalInfo}</dd>
                </div>
              )}
            </dl>
            <div className="modal-actions">
              {selectedComplaint.status !== 'Resolved' && selectedComplaint.status !== 'Cancelled' && (
                <button
                  className="resolve-button"
                  type="button"
                  onClick={() => void updateStatus(selectedComplaint.id, 'Resolved')}
                >
                  Mark Resolved
                </button>
              )}
              <button className="view-button" type="button" onClick={() => openEditor(selectedComplaint)}>
                Edit complaint
              </button>
              <button className="delete-button" type="button" onClick={() => void deleteComplaint(selectedComplaint)}>
                {selectedComplaint.status === 'Resolved' ? 'Delete' : 'Cancel complaint'}
              </button>
            </div>
          </section>
        </div>
      )}

      {selectedComplaint && editData && modalMode === 'edit' && (
        <div className="modal-backdrop" role="presentation">
          <form className="details-modal edit-modal" onSubmit={handleEditSubmit} aria-labelledby="edit-title">
            <div className="modal-header">
              <div>
                <p className="section-label">Update request #{String(selectedComplaint.id).padStart(3, '0')}</p>
                <h2 id="edit-title">Edit complaint</h2>
              </div>
              <button className="close-button" type="button" aria-label="Close editor" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="form-fields edit-fields">
              <label htmlFor="edit-residentName">
                Resident name
                <input id="edit-residentName" name="residentName" value={editData.residentName} onChange={handleEditInputChange} required />
              </label>
              <label htmlFor="edit-roomNumber">
                Room / flat number
                <input id="edit-roomNumber" name="roomNumber" value={editData.roomNumber} onChange={handleEditInputChange} required />
              </label>
              <label htmlFor="edit-contact">
                Contact number
                <input
                  id="edit-contact"
                  name="contact"
                  type="tel"
                  pattern="[0-9+() -]{7,20}"
                  value={editData.contact}
                  onChange={handleEditInputChange}
                />
              </label>
              <label htmlFor="edit-category">
                Category
                <select id="edit-category" name="category" value={editData.category} onChange={handleEditInputChange} required>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="edit-priority">
                Priority
                <select id="edit-priority" name="priority" value={editData.priority} onChange={handleEditInputChange}>
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="edit-status">
                Status
                <select id="edit-status" name="status" value={editData.status} onChange={handleEditInputChange}>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-width" htmlFor="edit-description">
                Description
                <textarea
                  id="edit-description"
                  name="description"
                  value={editData.description}
                  onChange={handleEditInputChange}
                  rows={4}
                  required
                />
              </label>
              <label className="full-width" htmlFor="edit-additionalInfo">
                Additional information <span className="optional-label">Optional</span>
                <textarea
                  id="edit-additionalInfo"
                  name="additionalInfo"
                  value={editData.additionalInfo}
                  onChange={handleEditInputChange}
                  rows={2}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="view-button" type="button" onClick={() => setModalMode('details')}>
                Back
              </button>
              <button className="primary-button" type="submit">
                Save changes <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

export default App;
