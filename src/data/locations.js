// Five Colleges location directory.
// Reconstructed during the five-colleges recovery from
// backend/config/institutions.five-colleges.example.yml — the original
// src/data/locations.js was never committed to git. Verify codes against
// production inventory data if locations look wrong.
export const locations = [
  // Amherst College
  { code: 'ACMMS', name: 'Multimedia Services Equipment' },
  { code: 'AFIN', name: 'Internet' },
  { code: 'AFRES', name: 'Frost Reserves' },
  // Hampshire College
  { code: 'HEQPT', name: 'Equipment - Check out at InfoBar' },
  { code: 'HCIT', name: 'IT Equipment' },
  { code: 'HMED', name: 'Media Services Equipment' },
  // Mount Holyoke College
  { code: 'MQEQU', name: 'Circulation Equipment' },
  { code: 'MPEQU', name: 'Pratt Circulation Equipment' },
  { code: 'MLRC', name: 'LRC' },
  // Smith College
  { code: 'SCAEQ', name: 'Art Equipment' },
  { code: 'SCJEQ', name: 'Josten Equipment' },
  { code: 'SNNEQ', name: 'Neilson Equipment' },
  // UMass Amherst
  { code: 'UMDML', name: 'Digital Media Lab' },
  { code: 'UMDUB', name: 'W. E. B. Du Bois Library' },
  { code: 'UMSCI', name: 'Science & Engineering Library' },
];

export default locations;
