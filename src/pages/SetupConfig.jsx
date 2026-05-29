import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  ButtonGroup,
  Col,
  Container,
  FormGroup,
  Input,
  Label,
  Row,
} from 'reactstrap';
import {
  createDefaultSetupConfig,
  createEmptyInstitution,
  generateEnvSnippet,
  generateInstitutionsYaml,
  validateSetupConfig,
} from '../utils/setupConfigGenerator';
import './SetupConfig.css';

const updateListValue = (values, index, nextValue) => values.map((value, i) => (i === index ? nextValue : value));
const removeListValue = (values, index) => values.filter((_, i) => i !== index);

function FieldLabel({ children, help }) {
  return (
    <div className="field-label">
      <Label>{children}</Label>
      {help && (
        <span className="help-indicator" title={help} aria-label={help}>
          <i className="bi bi-question-circle" aria-hidden="true"></i>
        </span>
      )}
    </div>
  );
}

function SetupConfig() {
  const [config, setConfig] = useState(createDefaultSetupConfig);
  const [activeInstitution, setActiveInstitution] = useState(0);
  const [copied, setCopied] = useState('');

  const yaml = useMemo(() => generateInstitutionsYaml(config), [config]);
  const envSnippet = useMemo(() => generateEnvSnippet(config), [config]);
  const errors = useMemo(() => validateSetupConfig(config), [config]);
  const institution = config.institutions[activeInstitution] || config.institutions[0];

  const setField = (path, value) => {
    setConfig((current) => {
      const next = structuredClone(current);
      let target = next;
      path.slice(0, -1).forEach((key) => {
        target = target[key];
      });
      target[path[path.length - 1]] = value;
      return next;
    });
  };

  const setInstitutionField = (field, value) => {
    setConfig((current) => {
      const institutions = current.institutions.map((item, index) => (
        index === activeInstitution ? { ...item, [field]: value } : item
      ));
      const primaryInstitutionSlug = field === 'slug' && current.deployment.primaryInstitutionSlug === institution.slug
        ? value
        : current.deployment.primaryInstitutionSlug;
      return {
        ...current,
        deployment: { ...current.deployment, primaryInstitutionSlug },
        institutions,
      };
    });
  };

  const setInstitutionNested = (field, value) => {
    setConfig((current) => ({
      ...current,
      institutions: current.institutions.map((item, index) => (
        index === activeInstitution ? { ...item, defaults: { ...item.defaults, [field]: value } } : item
      )),
    }));
  };

  const copyText = async (label, text) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 1800);
  };

  const downloadText = (filename, text) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const addInstitution = () => {
    setConfig((current) => ({
      ...current,
      deployment: { ...current.deployment, type: 'multi-library', homePage: 'institution-picker' },
      institutions: [...current.institutions, createEmptyInstitution(current.institutions.length + 1)],
    }));
    setActiveInstitution(config.institutions.length);
  };

  const removeInstitution = () => {
    if (config.institutions.length === 1) return;
    setConfig((current) => {
      const institutions = current.institutions.filter((_, index) => index !== activeInstitution);
      return {
        ...current,
        deployment: {
          ...current.deployment,
          primaryInstitutionSlug: institutions[0].slug,
          type: institutions.length > 1 ? current.deployment.type : 'single-library',
          homePage: institutions.length > 1 ? current.deployment.homePage : 'redirect',
        },
        institutions,
      };
    });
    setActiveInstitution(Math.max(0, activeInstitution - 1));
  };

  const toggleAuthProvider = (provider) => {
    setConfig((current) => {
      const enabled = current.authProviders.includes(provider);
      const authProviders = enabled
        ? current.authProviders.filter((item) => item !== provider)
        : [...current.authProviders, provider];
      return { ...current, authProviders };
    });
  };

  return (
    <div className="setup-config-page">
      <Container fluid="xl" className="py-4">
        <header className="setup-header">
          <div>
            <Badge color="primary" pill>Configuration Generator</Badge>
            <h1>Build an institution config</h1>
            <p>
              Generate `backend/config/institutions.yml` and supporting `.env` values. This tool does not save files on the server.
            </p>
          </div>
          <div className="setup-header-actions">
            <Button color="primary" onClick={() => copyText('yaml', yaml)}>
              <i className="bi bi-clipboard me-2"></i>{copied === 'yaml' ? 'Copied YAML' : 'Copy YAML'}
            </Button>
            <Button color="secondary" outline onClick={() => downloadText('institutions.yml', yaml)}>
              <i className="bi bi-download me-2"></i>Download YAML
            </Button>
          </div>
        </header>

        <Row className="g-4">
          <Col lg={6}>
            <section className="setup-panel">
              <h2>Application</h2>
              <Row>
                <Col md={6}>
                  <FormGroup>
                    <FieldLabel help="The public name shown in the browser title, home page, admin copy, and generated defaults.">
                      Application name
                    </FieldLabel>
                    <Input value={config.appName} onChange={(event) => setField(['appName'], event.target.value)} />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <FieldLabel help="The institution used as the default admin/public target and the redirect destination for single-library deployments.">
                      Primary institution
                    </FieldLabel>
                    <Input
                      type="select"
                      value={config.deployment.primaryInstitutionSlug}
                      onChange={(event) => setField(['deployment', 'primaryInstitutionSlug'], event.target.value)}
                    >
                      {config.institutions.map((item) => (
                        <option key={item.slug} value={item.slug}>{item.name || item.slug}</option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <FormGroup>
                    <FieldLabel help="single-library is for one library. multi-library shows multiple configured institutions.">
                      Deployment type
                    </FieldLabel>
                    <Input
                      type="select"
                      value={config.deployment.type}
                      onChange={(event) => setField(['deployment', 'type'], event.target.value)}
                    >
                      <option value="single-library">single-library</option>
                      <option value="multi-library">multi-library</option>
                    </Input>
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <FieldLabel help="redirect sends users straight to the primary institution. institution-picker shows institution cards.">
                      Home page behavior
                    </FieldLabel>
                    <Input
                      type="select"
                      value={config.deployment.homePage}
                      onChange={(event) => setField(['deployment', 'homePage'], event.target.value)}
                    >
                      <option value="redirect">redirect</option>
                      <option value="institution-picker">institution-picker</option>
                    </Input>
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md={8}>
                  <FormGroup>
                    <FieldLabel help="Label shown on the request-access affiliation field. For consortia, use a question such as 'Where are you from?'.">
                      Request access prompt
                    </FieldLabel>
                    <Input
                      value={config.requestAccess.affiliationPrompt}
                      onChange={(event) => setField(['requestAccess', 'affiliationPrompt'], event.target.value)}
                    />
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup check className="setup-check">
                    <Input
                      type="checkbox"
                      checked={config.requestAccess.showAffiliationSelector}
                      onChange={(event) => setField(['requestAccess', 'showAffiliationSelector'], event.target.checked)}
                    />
                    <Label check title="When enabled, users choose an institution on the request-access form.">Show selector</Label>
                  </FormGroup>
                </Col>
              </Row>
              <div>
                <FieldLabel help="Choose shibboleth for institution SSO, local for username/password admin login, or both.">
                  Auth providers
                </FieldLabel>
                <ButtonGroup className="d-flex flex-wrap setup-button-group">
                  {['shibboleth', 'local'].map((provider) => (
                    <Button
                      key={provider}
                      color={config.authProviders.includes(provider) ? 'primary' : 'secondary'}
                      outline={!config.authProviders.includes(provider)}
                      onClick={() => toggleAuthProvider(provider)}
                    >
                      {provider}
                    </Button>
                  ))}
                </ButtonGroup>
              </div>
            </section>

            <section className="setup-panel">
              <div className="setup-section-title">
                <h2>Institutions</h2>
                <div>
                  <Button size="sm" color="primary" outline onClick={addInstitution}>Add</Button>{' '}
                  <Button size="sm" color="danger" outline onClick={removeInstitution} disabled={config.institutions.length === 1}>Remove</Button>
                </div>
              </div>
              <div className="institution-tabs">
                {config.institutions.map((item, index) => (
                  <Button
                    key={`${item.slug}-${index}`}
                    size="sm"
                    color={index === activeInstitution ? 'primary' : 'secondary'}
                    outline={index !== activeInstitution}
                    onClick={() => setActiveInstitution(index)}
                  >
                    {item.name || `Institution ${index + 1}`}
                  </Button>
                ))}
              </div>

              {institution && (
                <>
                  <Row>
                    <Col md={6}>
                      <FormGroup>
                        <FieldLabel help="URL-safe identifier used in routes such as /school/main-library and /admin/main-library.">
                          Slug
                        </FieldLabel>
                        <Input value={institution.slug} onChange={(event) => setInstitutionField('slug', event.target.value)} />
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <FieldLabel help="Short code stored on inventory records and used by backend owner filters.">
                          Owner code
                        </FieldLabel>
                        <Input value={institution.code} onChange={(event) => setInstitutionField('code', event.target.value)} />
                      </FormGroup>
                    </Col>
                  </Row>
                  <FormGroup>
                    <FieldLabel help="Institution name displayed on cards, selectors, and admin screens.">
                      Name
                    </FieldLabel>
                    <Input value={institution.name} onChange={(event) => setInstitutionField('name', event.target.value)} />
                  </FormGroup>
                  <FormGroup>
                    <FieldLabel help="Image used on the multi-campus dashboard card. Save files in public/images and reference them with /images/file.png.">
                      Dashboard image path
                    </FieldLabel>
                    <Input value={institution.image} onChange={(event) => setInstitutionField('image', event.target.value)} />
                    <small className="text-muted">Save images in `public/images/` and reference them as `/images/file-name.png`.</small>
                  </FormGroup>

                  <EditableList
                    label="Branch prefixes"
                    help="Optional prefixes used to filter public branch options for this institution."
                    values={institution.branchPrefixes}
                    onChange={(values) => setInstitutionField('branchPrefixes', values)}
                  />
                  <EditableObjectList
                    label="Branches"
                    help="Library branch choices shown in public filters and admin item assignment."
                    values={institution.branches}
                    onChange={(values) => setInstitutionField('branches', values)}
                    codeLabel="Branch code"
                    nameLabel="Branch name"
                  />
                  <EditableObjectList
                    label="FOLIO locations"
                    help="FOLIO location codes shown when staff search inventory by location."
                    values={institution.locations}
                    onChange={(values) => setInstitutionField('locations', values)}
                    codeLabel="Location code"
                    nameLabel="Location name"
                  />
                  <EditableList
                    label="Email domains"
                    help="Domains used to infer affiliation for access requests and Shibboleth institution matching."
                    values={institution.emailDomains}
                    onChange={(values) => setInstitutionField('emailDomains', values)}
                  />
                  <Row>
                    <Col md={4}>
                      <FormGroup>
                        <FieldLabel help="Fallback library name before custom admin layout values are saved.">
                          Default library name
                        </FieldLabel>
                        <Input value={institution.defaults.libraryName} onChange={(event) => setInstitutionNested('libraryName', event.target.value)} />
                      </FormGroup>
                    </Col>
                    <Col md={4}>
                      <FormGroup>
                        <FieldLabel help="Fallback public page heading before custom admin layout values are saved.">
                          Default header text
                        </FieldLabel>
                        <Input value={institution.defaults.headerText} onChange={(event) => setInstitutionNested('headerText', event.target.value)} />
                      </FormGroup>
                    </Col>
                    <Col md={4}>
                      <FormGroup>
                        <FieldLabel help="Fallback footer text before custom admin layout values are saved.">
                          Default footer text
                        </FieldLabel>
                        <Input value={institution.defaults.footerText} onChange={(event) => setInstitutionNested('footerText', event.target.value)} />
                      </FormGroup>
                    </Col>
                  </Row>
                </>
              )}
            </section>

            <section className="setup-panel">
              <h2>Shibboleth and FOLIO env</h2>
              <Row>
                {[
                  ['idAttribute', 'ID attribute'],
                  ['usernameAttribute', 'Username attribute'],
                  ['firstNameAttribute', 'First name attribute'],
                  ['lastNameAttribute', 'Last name attribute'],
                  ['emailAttribute', 'Email attribute'],
                  ['institutionAttribute', 'Institution attribute'],
                ].map(([field, label]) => (
                  <Col md={6} key={field}>
                    <FormGroup>
                      <FieldLabel help={shibbolethHelp[field]}>{label}</FieldLabel>
                      <Input value={config.shibboleth[field]} onChange={(event) => setField(['shibboleth', field], event.target.value)} />
                    </FormGroup>
                  </Col>
                ))}
              </Row>
              <FormGroup>
                <FieldLabel help="Optional comma-separated map from a Shibboleth institution attribute value to an institution slug. Example: main:main-library,law:law-library.">
                  Institution map
                </FieldLabel>
                <Input
                  value={config.shibboleth.institutionMap}
                  onChange={(event) => setField(['shibboleth', 'institutionMap'], event.target.value)}
                  placeholder="main:main-library,law:law-library"
                />
              </FormGroup>
              <Row>
                <Col md={6}>
                  <FormGroup>
                    <FieldLabel help="EBSCO Edge RTAC base URL used for real-time availability lookups.">
                      Availability base URL
                    </FieldLabel>
                    <Input value={config.folio.availabilityBaseUrl} onChange={(event) => setField(['folio', 'availabilityBaseUrl'], event.target.value)} />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <FieldLabel help="FOLIO API/Okapi base URL used for inventory search.">
                      Inventory base URL
                    </FieldLabel>
                    <Input value={config.folio.inventoryBaseUrl} onChange={(event) => setField(['folio', 'inventoryBaseUrl'], event.target.value)} />
                  </FormGroup>
                </Col>
                <Col md={12}>
                  <FormGroup>
                    <FieldLabel help="Path appended to the EBSCO Edge base URL for RTAC lookups. Most sites can keep the default.">
                      RTAC base path
                    </FieldLabel>
                    <Input value={config.folio.rtacBasePath} onChange={(event) => setField(['folio', 'rtacBasePath'], event.target.value)} />
                  </FormGroup>
                </Col>
              </Row>
            </section>
          </Col>

          <Col lg={6}>
            <div className="setup-preview-stack">
            <section className="setup-preview">
              <div className="setup-section-title">
                <h2>Generated YAML</h2>
                <Button size="sm" color="primary" outline onClick={() => copyText('yaml', yaml)}>
                  {copied === 'yaml' ? 'Copied' : 'Copy'}
                </Button>
              </div>
              {errors.length > 0 ? (
                <div className="alert alert-warning">
                  <strong>Review before using:</strong>
                  <ul className="mb-0 mt-2">
                    {errors.map((error) => <li key={error}>{error}</li>)}
                  </ul>
                </div>
              ) : (
                <div className="alert alert-success">Configuration is structurally valid.</div>
              )}
              <pre>{yaml}</pre>
            </section>
            <section className="setup-preview">
              <div className="setup-section-title">
                <h2>Generated .env snippet</h2>
                <Button size="sm" color="primary" outline onClick={() => copyText('env', envSnippet)}>
                  {copied === 'env' ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <pre>{envSnippet}</pre>
            </section>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

const shibbolethHelp = {
  idAttribute: 'Server variable containing the persistent Shibboleth identifier. Common choices are eppn, uid, employeeNumber, or an institution-specific identifier.',
  usernameAttribute: 'Server variable matched against authorized_users.username.',
  firstNameAttribute: 'Server variable for the user first name, if your IdP provides one.',
  lastNameAttribute: 'Server variable for the user last name, if your IdP provides one.',
  emailAttribute: 'Server variable containing the user email address for domain matching.',
  institutionAttribute: 'Optional server variable whose value identifies a campus or institution.',
};

function EditableList({ label, help, values, onChange }) {
  return (
    <div className="setup-list">
      <div className="setup-section-title compact">
        <FieldLabel help={help}>{label}</FieldLabel>
        <Button size="sm" color="secondary" outline onClick={() => onChange([...values, ''])}>Add</Button>
      </div>
      {values.map((value, index) => (
        <div className="setup-list-row" key={index}>
          <Input value={value} onChange={(event) => onChange(updateListValue(values, index, event.target.value))} />
          <Button size="sm" color="danger" outline onClick={() => onChange(removeListValue(values, index))}>Remove</Button>
        </div>
      ))}
    </div>
  );
}

function EditableObjectList({ label, help, values, onChange, codeLabel, nameLabel }) {
  return (
    <div className="setup-list">
      <div className="setup-section-title compact">
        <FieldLabel help={help}>{label}</FieldLabel>
        <Button size="sm" color="secondary" outline onClick={() => onChange([...values, { code: '', name: '' }])}>Add</Button>
      </div>
      {values.map((value, index) => (
        <div className="setup-object-row" key={index}>
          <Input placeholder={codeLabel} value={value.code} onChange={(event) => onChange(values.map((item, i) => (i === index ? { ...item, code: event.target.value } : item)))} />
          <Input placeholder={nameLabel} value={value.name} onChange={(event) => onChange(values.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))} />
          <Button size="sm" color="danger" outline onClick={() => onChange(values.filter((_, i) => i !== index))}>Remove</Button>
        </div>
      ))}
    </div>
  );
}

export default SetupConfig;
