const mongoose = require('mongoose');
const Project = require('../models/common/Project');
const Client = require('../models/crm/CRMClient');
const Vendor = require('../models/crm/CRMVendor');
const Influencer = require('../models/crm/CRMInfluencer');
const MarketingImport = require('../models/marketing/MarketingImport');
const { resolveLocation } = require('./marketingImport.service');

const RECORD_MODELS = [
  ['client', Client, 'address'],
  ['vendor', Vendor, 'address'],
  ['influencer', Influencer, 'location'],
];
const hasCoordinates = row => Number.isFinite(row?.latitude) && Number.isFinite(row?.longitude);
const invalid = message => Object.assign(new Error(message), { statusCode: 400 });
let cached;
let pending;

async function loadSnapshot() {
  const [projects, schools, ...collections] = await Promise.all([
    Project.find().select('name projectCode').sort({ name: 1 }).lean(),
    MarketingImport.find({ latitude: { $type: 'number' }, longitude: { $type: 'number' } })
      .select('projectId latitude longitude city state').lean(),
    ...RECORD_MODELS.map(([, Model, location]) => Model.find({ isActive: true })
      .select('project name status ' + location + (Model === Vendor ? ' entityType' : '')).lean()),
  ]);
  const coordinates = new Map(schools.map(row => [String(row._id), row]));
  const projectNames = new Map(projects.map(row => [String(row._id), row.name]));
  const resolved = new Map();
  const records = collections.flatMap((rows, index) => {
    const [kind, , locationField] = RECORD_MODELS[index];
    return rows.map(row => {
      const address = row[locationField] || '';
      const projectId = row.project ? String(row.project) : null;
      const id = String(row._id);
      const school = kind === 'client' && coordinates.get(id);
      if (!resolved.has(address)) resolved.set(address, resolveLocation(address));
      const place = school && String(school.projectId) === projectId ? school : resolved.get(address);
      const point = hasCoordinates(place) ? {
        key: [place.latitude, place.longitude].join(','),
        city: place.city, latitude: place.latitude, longitude: place.longitude,
      } : null;
      return {
        id, projectId, projectName: projectNames.get(projectId) || (projectId ? 'Unknown project' : 'Unassigned'),
        name: row.name, address, kind: row.entityType === 'third_party' ? 'third_party' : kind,
        status: row.status, point,
      };
    });
  });
  records.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return { projects, records };
}

async function getSnapshot() {
  if (cached && cached.expires > Date.now()) return cached.data;
  if (!pending) {
    pending = loadSnapshot().then(data => {
      cached = { data, expires: Date.now() + 30_000 };
      return data;
    }).finally(() => { pending = null; });
  }
  return pending;
}

async function getCrmMap({ projectId = 'all', kind = 'all', search = '', location = '', page = 1 } = {}) {
  if (projectId !== 'all' && projectId !== 'unassigned' && !mongoose.isValidObjectId(projectId)) {
    throw invalid('Invalid project filter.');
  }
  if (!['all', 'client', 'vendor', 'third_party', 'influencer'].includes(kind)) throw invalid('Invalid record type.');
  const snapshot = await getSnapshot();
  if (projectId !== 'all' && projectId !== 'unassigned' && !snapshot.projects.some(p => String(p._id) === projectId)) {
    throw invalid('Project is unavailable.');
  }
  const term = String(search).trim().slice(0, 120).toLowerCase();
  const points = new Map();
  const matches = [];
  let total = 0;
  let unmapped = 0;
  for (const row of snapshot.records) {
    if (projectId !== 'all' && row.projectId !== (projectId === 'unassigned' ? null : projectId)) continue;
    if (kind !== 'all' && row.kind !== kind) continue;
    if (term && ![row.name, row.address, row.projectName].some(value => value.toLowerCase().includes(term))) continue;
    total++;
    if (row.point) {
      const point = points.get(row.point.key) || { ...row.point, count: 0 };
      point.count++;
      points.set(point.key, point);
    } else {
      unmapped++;
    }
    if (!location || (location === 'unmapped' ? !row.point : row.point?.key === location)) matches.push(row);
  }
  const pageSize = 25;
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.max(1, Math.min(pages, Math.trunc(Number(page)) || 1));
  return {
    projects: snapshot.projects, total, unmapped, points: [...points.values()],
    records: matches.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    matchingRecords: matches.length, page: currentPage, pages,
  };
}

module.exports = { getCrmMap };
