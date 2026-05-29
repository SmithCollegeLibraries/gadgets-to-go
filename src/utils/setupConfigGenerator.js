export const createEmptyInstitution = (index = 1) => ({
  slug: `library-${index}`,
  code: `LIB${index}`,
  name: `Library ${index}`,
  image: `/images/library-${index}.png`,
  branchPrefixes: [`LIB${index}`],
  branches: [{ code: `LIB${index}MAIN`, name: `Library ${index} Main` }],
  locations: [{ code: `LIB${index}EQ`, name: `Library ${index} Equipment` }],
  emailDomains: [`library-${index}.edu`],
  defaults: {
    libraryName: `Library ${index}`,
    headerText: 'Equipment Checkout',
    footerText: '',
  },
});

export const createDefaultSetupConfig = () => ({
  appName: 'Library Equipment',
  deployment: {
    type: 'single-library',
    primaryInstitutionSlug: 'main-library',
    homePage: 'redirect',
  },
  requestAccess: {
    affiliationPrompt: 'Library',
    showAffiliationSelector: false,
  },
  authProviders: ['shibboleth', 'local'],
  institutions: [
    {
      ...createEmptyInstitution(1),
      slug: 'main-library',
      code: 'LIB',
      name: 'Main Library',
      image: '/images/main-library.png',
      branchPrefixes: ['LIB'],
      branches: [{ code: 'LIBMAIN', name: 'Main Library' }],
      locations: [{ code: 'LIBEQ', name: 'Equipment Desk' }],
      emailDomains: ['example.edu'],
      defaults: {
        libraryName: 'Main Library',
        headerText: 'Equipment Checkout',
        footerText: '',
      },
    },
  ],
  shibboleth: {
    idAttribute: 'eppn',
    usernameAttribute: 'uid',
    firstNameAttribute: 'givenName',
    lastNameAttribute: 'sn',
    emailAttribute: 'mail',
    institutionAttribute: '',
    institutionMap: '',
  },
  folio: {
    availabilityBaseUrl: '',
    inventoryBaseUrl: '',
    rtacBasePath: '/prod/rtac/folioRTAC?mms_id=',
  },
});

const scalar = (value) => {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null || value === undefined || value === '') return '""';
  const text = String(value);
  if (/^[A-Za-z0-9_./:@-]+$/.test(text) && !['true', 'false', 'null'].includes(text)) {
    return text;
  }
  return JSON.stringify(text);
};

const arrayBlock = (indent, values) => {
  if (!values || values.length === 0) return [`${indent}- ""`];
  return values.map((value) => `${indent}- ${scalar(value)}`);
};

const objectArrayBlock = (indent, values, fields) => {
  if (!values || values.length === 0) return [];
  return values.flatMap((value) => [
    `${indent}- ${fields[0]}: ${scalar(value[fields[0]])}`,
    ...fields.slice(1).map((field) => `${indent}  ${field}: ${scalar(value[field])}`),
  ]);
};

export const generateInstitutionsYaml = (config) => {
  const lines = [
    `appName: ${scalar(config.appName)}`,
    'deployment:',
    `  type: ${scalar(config.deployment.type)}`,
    `  primaryInstitutionSlug: ${scalar(config.deployment.primaryInstitutionSlug)}`,
    `  homePage: ${scalar(config.deployment.homePage)}`,
    'requestAccess:',
    `  affiliationPrompt: ${scalar(config.requestAccess.affiliationPrompt)}`,
    `  showAffiliationSelector: ${scalar(config.requestAccess.showAffiliationSelector)}`,
    'authProviders:',
    ...arrayBlock('  ', config.authProviders),
    'institutions:',
  ];

  config.institutions.forEach((institution) => {
    lines.push(
      `  - slug: ${scalar(institution.slug)}`,
      `    code: ${scalar(institution.code)}`,
      `    name: ${scalar(institution.name)}`,
      `    image: ${scalar(institution.image)}`,
      '    branchPrefixes:',
      ...arrayBlock('      ', institution.branchPrefixes),
      '    branches:',
      ...objectArrayBlock('      ', institution.branches, ['code', 'name']),
      '    locations:',
      ...objectArrayBlock('      ', institution.locations, ['code', 'name']),
      '    emailDomains:',
      ...arrayBlock('      ', institution.emailDomains),
      '    defaults:',
      `      libraryName: ${scalar(institution.defaults.libraryName)}`,
      `      headerText: ${scalar(institution.defaults.headerText)}`,
      `      footerText: ${scalar(institution.defaults.footerText)}`,
    );
  });

  return `${lines.join('\n')}\n`;
};

export const generateEnvSnippet = (config) => {
  const lines = [
    `AUTH_PROVIDERS=${config.authProviders.join(',')}`,
    `SHIB_ID_ATTRIBUTE=${config.shibboleth.idAttribute}`,
    `SHIB_USERNAME_ATTRIBUTE=${config.shibboleth.usernameAttribute}`,
    `SHIB_FIRST_NAME_ATTRIBUTE=${config.shibboleth.firstNameAttribute}`,
    `SHIB_LAST_NAME_ATTRIBUTE=${config.shibboleth.lastNameAttribute}`,
    `SHIB_EMAIL_ATTRIBUTE=${config.shibboleth.emailAttribute}`,
    `SHIB_INSTITUTION_ATTRIBUTE=${config.shibboleth.institutionAttribute}`,
    `SHIB_INSTITUTION_MAP=${config.shibboleth.institutionMap}`,
    `FOLIO_AVAILABILITY_BASE_URL=${config.folio.availabilityBaseUrl}`,
    `FOLIO_INVENTORY_BASE_URL=${config.folio.inventoryBaseUrl}`,
    `FOLIO_RTAC_BASE_PATH=${config.folio.rtacBasePath}`,
  ];

  return `${lines.join('\n')}\n`;
};

export const validateSetupConfig = (config) => {
  const errors = [];
  const slugs = new Set();
  const codes = new Set();

  if (!config.appName.trim()) errors.push('Application name is required.');
  if (!['single-library', 'multi-library'].includes(config.deployment.type)) {
    errors.push('Deployment type must be single-library or multi-library.');
  }
  if (!['redirect', 'institution-picker'].includes(config.deployment.homePage)) {
    errors.push('Home page must be redirect or institution-picker.');
  }
  if (config.institutions.length === 0) errors.push('At least one institution is required.');

  config.institutions.forEach((institution, index) => {
    const label = institution.name || `Institution ${index + 1}`;
    if (!institution.slug.trim()) errors.push(`${label}: slug is required.`);
    if (!institution.code.trim()) errors.push(`${label}: code is required.`);
    if (!institution.name.trim()) errors.push(`${label}: name is required.`);
    if (institution.image && !institution.image.startsWith('/images/')) {
      errors.push(`${label}: image should use /images/filename.ext and the file should live in public/images/.`);
    }
    if (slugs.has(institution.slug)) errors.push(`${label}: slug must be unique.`);
    if (codes.has(institution.code)) errors.push(`${label}: code must be unique.`);
    slugs.add(institution.slug);
    codes.add(institution.code);
  });

  if (!slugs.has(config.deployment.primaryInstitutionSlug)) {
    errors.push('Primary institution slug must match one configured institution.');
  }

  return errors;
};
