// Five Colleges branch directory.
// `id` and `code` are the app-facing branch code used in inventory assignment.
// `folioBranchId` is the FOLIO branch UUID.
//
// Consumed as a flat list; each school's branches are selected via
// `branches.filter(b => b.code.startsWith(prefix))` where prefix is the
// 2-letter campus code (SC, MH, AC, HC, UM).
export const branches = [
  // Amherst College (AC)
  { id: 'ACFST', code: 'ACFST', name: 'Frost Library', folioBranchId: 'ea7050c4-8946-459e-8015-f21141187636' },
  { id: 'ACMUS', code: 'ACMUS', name: 'Music Library', folioBranchId: '6678ab07-4502-4ff8-84af-49e1fd2a4832' },
  { id: 'ACSCI', code: 'ACSCI', name: 'Science Library', folioBranchId: '87b2c7d7-18d5-4e84-a470-2d14054a1e96' },
  // Hampshire College (HC)
  { id: 'HCLIB', code: 'HCLIB', name: 'Harold Johnson Library', folioBranchId: '61812140-c069-433d-8cc6-13b5086deb97' },
  { id: 'HCMED', code: 'HCMED', name: 'Media', folioBranchId: '467ace51-e982-49da-9eaf-30f0dc67af4b' },
  { id: 'HCASC', code: 'HCASC', name: 'Archives & Special Collections', folioBranchId: '5de15eea-1234-46d3-8a79-9fa7de57fa8e' },
  // Mount Holyoke College (MH)
  { id: 'MHLIB', code: 'MHLIB', name: 'Main Library', folioBranchId: '8d95f489-3dd5-446d-939b-1f5d5a9c2ac7' },
  { id: 'MHPSL', code: 'MHPSL', name: 'Pierce Stevens Lib-Pratt', folioBranchId: '0759abd5-6bd1-400d-8960-c2511a1534f0' },
  { id: 'MHLRC', code: 'MHLRC', name: 'Language Resource Center', folioBranchId: '36ae1ae5-335c-4a6b-8b2b-cce577fb0aeb' },
  // Smith College (SC)
  { id: 'SCNLS', code: 'SCNLS', name: 'Neilson Library', folioBranchId: 'd541a5ab-50d8-4822-83fc-8469ddfcbb57' },
  { id: 'SCJOS', code: 'SCJOS', name: 'Josten Library', folioBranchId: '2d9fc0a4-5ff0-4c19-a819-910f090614bc' },
  { id: 'SCPC', code: 'SCPC', name: 'Special Collections', folioBranchId: '15e2c95c-4438-44b9-a7a2-48302cc30f26' },
  { id: 'SCANN', code: 'SCANN', name: 'Annex', folioBranchId: '6bb6c83a-dd37-43dd-bf4d-bea653be401a' },
  { id: 'SCTYO', code: 'SCTYO', name: 'Young Library' },
  { id: 'SCHIL', code: 'SCHIL', name: 'Hillyer Art Library', folioBranchId: 'b9a3e61b-26cf-4d23-a24a-1e339c61a646' },
  { id: 'SCWST', code: 'SCWST', name: 'West St Storage' },
  // UMass Amherst (UM)
  { id: 'UMDUB', code: 'UMDUB', name: 'W. E. B. Du Bois Library', folioBranchId: 'f2ccdb19-6f46-4171-bd8e-be890ea67133' },
  { id: 'UMSCI', code: 'UMSCI', name: 'Science & Engineering Library', folioBranchId: '627bffaf-28e6-4e33-ac90-f0456325d394' },
  { id: 'UMDML', code: 'UMDML', name: 'Digital Media Lab', folioBranchId: '81c27a73-97a4-4063-b5cb-d790bfea1e14' },
];

export default branches;
