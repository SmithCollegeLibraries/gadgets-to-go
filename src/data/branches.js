// Five Colleges branch directory.
// Reconstructed during the five-colleges recovery from
// backend/config/institutions.five-colleges.example.yml — the original
// src/data/branches.js was never committed to git. Verify codes against
// production inventory data if branch names fail to resolve.
//
// Consumed as a flat list; each school's branches are selected via
// `branches.filter(b => b.code.startsWith(prefix))` where prefix is the
// 2-letter campus code (SC, MH, AC, HC, UM).
export const branches = [
  // Amherst College (AC)
  { id: 'ACFST', code: 'ACFST', name: 'Frost Library' },
  { id: 'ACMUS', code: 'ACMUS', name: 'Music Library' },
  { id: 'ACSCI', code: 'ACSCI', name: 'Science Library' },
  // Hampshire College (HC)
  { id: 'HCLIB', code: 'HCLIB', name: 'Harold Johnson Library' },
  { id: 'HCMED', code: 'HCMED', name: 'Media' },
  { id: 'HCASC', code: 'HCASC', name: 'Archives & Special Collections' },
  // Mount Holyoke College (MH)
  { id: 'MHLIB', code: 'MHLIB', name: 'Main Library' },
  { id: 'MHPSL', code: 'MHPSL', name: 'Pierce Stevens Lib-Pratt' },
  { id: 'MHLRC', code: 'MHLRC', name: 'Language Resource Center' },
  // Smith College (SC)
  { id: 'SCNLS', code: 'SCNLS', name: 'Neilson Library' },
  { id: 'SCJOS', code: 'SCJOS', name: 'Josten Library' },
  { id: 'SCPC', code: 'SCPC', name: 'Special Collections' },
  // UMass Amherst (UM)
  { id: 'UMDUB', code: 'UMDUB', name: 'W. E. B. Du Bois Library' },
  { id: 'UMSCI', code: 'UMSCI', name: 'Science & Engineering Library' },
  { id: 'UMDML', code: 'UMDML', name: 'Digital Media Lab' },
];

export default branches;
