const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = Number(process.env.PORT) || 3001;
const clientBuildDirectory = path.join(__dirname, 'my-app', 'build');
const complaintDataFile = path.join(__dirname, 'data', 'complaints.json');
const categories = new Set(['Electricity', 'Plumbing', 'Water Supply', 'Internet', 'Housekeeping', 'Maintenance', 'Other']);
const priorities = new Set(['Normal', 'High', 'Emergency']);
const statuses = new Set(['Pending', 'In Progress', 'Resolved', 'Cancelled']);
const editableFields = new Set([
  'residentName',
  'roomNumber',
  'contact',
  'category',
  'description',
  'priority',
  'status',
  'additionalInfo',
]);
const requiredFields = ['residentName', 'roomNumber', 'category', 'description'];
const contactPattern = /^[0-9+() -]{7,20}$/;

function loadComplaints() {
  try {
    if (!fs.existsSync(complaintDataFile)) {
      return [];
    }

    const savedComplaints = JSON.parse(fs.readFileSync(complaintDataFile, 'utf8'));
    return Array.isArray(savedComplaints) ? savedComplaints.filter((complaint) => complaint && typeof complaint === 'object') : [];
  } catch (error) {
    console.error('Unable to read saved complaints:', error);
    return [];
  }
}

function saveComplaints(nextComplaints) {
  const dataDirectory = path.dirname(complaintDataFile);
  const temporaryDataFile = `${complaintDataFile}.tmp`;

  fs.mkdirSync(dataDirectory, { recursive: true });
  fs.writeFileSync(temporaryDataFile, `${JSON.stringify(nextComplaints, null, 2)}\n`);
  fs.renameSync(temporaryDataFile, complaintDataFile);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateComplaintPayload(payload, isCreate = false) {
  if (!isPlainObject(payload)) {
    return { errors: ['A JSON complaint object is required.'], values: null };
  }

  const invalidFields = Object.keys(payload).filter((field) => !editableFields.has(field));
  if (invalidFields.length > 0) {
    return { errors: [`Unsupported field: ${invalidFields.join(', ')}.`], values: null };
  }

  if (!isCreate && Object.keys(payload).length === 0) {
    return { errors: ['Provide at least one field to update.'], values: null };
  }

  const errors = [];
  const values = {};

  for (const field of requiredFields) {
    if ((isCreate || Object.prototype.hasOwnProperty.call(payload, field)) && !hasText(payload[field])) {
      errors.push(`${field} is required.`);
    } else if (Object.prototype.hasOwnProperty.call(payload, field)) {
      values[field] = payload[field].trim();
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'contact')) {
    if (typeof payload.contact !== 'string') {
      errors.push('contact must be text.');
    } else {
      values.contact = payload.contact.trim();

      if (values.contact && !contactPattern.test(values.contact)) {
        errors.push('contact must be a valid phone number.');
      }
    }
  }

  if ((isCreate || Object.prototype.hasOwnProperty.call(payload, 'category')) && !categories.has(values.category ?? payload.category)) {
    errors.push('category is invalid.');
  }

  if ((isCreate || Object.prototype.hasOwnProperty.call(payload, 'priority'))) {
    if (!hasText(payload.priority) || !priorities.has(payload.priority.trim())) {
      errors.push('priority is invalid.');
    } else {
      values.priority = payload.priority.trim();
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    if (!hasText(payload.status) || !statuses.has(payload.status.trim())) {
      errors.push('status is invalid.');
    } else {
      values.status = payload.status.trim();
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'additionalInfo')) {
    if (typeof payload.additionalInfo !== 'string') {
      errors.push('additionalInfo must be text.');
    } else {
      values.additionalInfo = payload.additionalInfo.trim();
    }
  }

  if (errors.length > 0) {
    return { errors, values: null };
  }

  return { errors: [], values };
}

function saveOrRespond(response, nextComplaints, message) {
  try {
    saveComplaints(nextComplaints);
    return true;
  } catch (error) {
    console.error(message, error);
    response.status(500).json({ error: 'Unable to save complaint data. Please try again.' });
    return false;
  }
}

function findComplaint(complaintId) {
  return complaints.find((complaint) => complaint.id === complaintId);
}

let complaints = loadComplaints();
let nextComplaintId = complaints.reduce((highestId, complaint) => {
  return Number.isInteger(complaint.id) && complaint.id > highestId ? complaint.id : highestId;
}, 0) + 1;

app.use(cors());
app.use(express.json());

app.get('/api/complaints', (request, response) => {
  const search = typeof request.query.search === 'string' ? request.query.search.trim().toLowerCase() : '';
  const category = typeof request.query.category === 'string' ? request.query.category : '';
  const priority = typeof request.query.priority === 'string' ? request.query.priority : '';
  const status = typeof request.query.status === 'string' ? request.query.status : '';

  const filteredComplaints = complaints.filter((complaint) => {
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
      (!search || searchableText.includes(search)) &&
      (!category || complaint.category === category) &&
      (!priority || complaint.priority === priority) &&
      (!status || complaint.status === status)
    );
  });

  response.json(filteredComplaints);
});

app.get('/api/complaints/:id', (request, response) => {
  const complaintId = Number(request.params.id);
  const complaint = findComplaint(complaintId);

  if (!Number.isInteger(complaintId) || !complaint) {
    return response.status(404).json({ error: 'Complaint not found.' });
  }

  return response.json(complaint);
});

app.post('/api/complaints', (request, response) => {
  const { errors, values } = validateComplaintPayload(request.body, true);
  if (errors.length > 0) {
    return response.status(400).json({ errors });
  }

  const now = new Date().toISOString();
  const complaint = {
    id: nextComplaintId,
    ...values,
    status: 'Pending',
    date: now,
    updatedAt: now,
  };
  const nextComplaints = [complaint, ...complaints];

  if (!saveOrRespond(response, nextComplaints, 'Unable to save complaint:')) {
    return undefined;
  }

  nextComplaintId += 1;
  complaints = nextComplaints;
  return response.status(201).json(complaint);
});

app.put('/api/complaints/:id', (request, response) => {
  const complaintId = Number(request.params.id);
  const complaint = findComplaint(complaintId);

  if (!Number.isInteger(complaintId) || !complaint) {
    return response.status(404).json({ error: 'Complaint not found.' });
  }

  const { errors, values } = validateComplaintPayload(request.body);
  if (errors.length > 0) {
    return response.status(400).json({ errors });
  }

  const updatedComplaint = { ...complaint, ...values, updatedAt: new Date().toISOString() };
  const nextComplaints = complaints.map((item) => (item.id === complaintId ? updatedComplaint : item));

  if (!saveOrRespond(response, nextComplaints, 'Unable to update complaint:')) {
    return undefined;
  }

  complaints = nextComplaints;
  return response.json(updatedComplaint);
});

app.patch('/api/complaints/:id/status', (request, response) => {
  const complaintId = Number(request.params.id);
  const complaint = findComplaint(complaintId);

  if (!Number.isInteger(complaintId) || !complaint) {
    return response.status(404).json({ error: 'Complaint not found.' });
  }

  const { errors, values } = validateComplaintPayload({ status: request.body?.status });
  if (errors.length > 0) {
    return response.status(400).json({ errors });
  }

  const updatedComplaint = { ...complaint, status: values.status, updatedAt: new Date().toISOString() };
  const nextComplaints = complaints.map((item) => (item.id === complaintId ? updatedComplaint : item));

  if (!saveOrRespond(response, nextComplaints, 'Unable to update complaint status:')) {
    return undefined;
  }

  complaints = nextComplaints;
  return response.json(updatedComplaint);
});

app.delete('/api/complaints/:id', (request, response) => {
  const complaintId = Number(request.params.id);
  const nextComplaints = complaints.filter((complaint) => complaint.id !== complaintId);

  if (!Number.isInteger(complaintId) || nextComplaints.length === complaints.length) {
    return response.status(404).json({ error: 'Complaint not found.' });
  }

  if (!saveOrRespond(response, nextComplaints, 'Unable to delete complaint:')) {
    return undefined;
  }

  complaints = nextComplaints;
  return response.status(204).end();
});

if (fs.existsSync(clientBuildDirectory)) {
  app.use(express.static(clientBuildDirectory));
  app.get(/.*/, (_request, response) => {
    response.sendFile(path.join(clientBuildDirectory, 'index.html'));
  });
}

app.use((error, _request, response, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return response.status(400).json({ error: 'Invalid JSON request body.' });
  }

  return next(error);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Complaint API listening on http://localhost:${port}`);
  });
}

module.exports = app;
