import {
  Form,
  FormGroup,
  Label,
  Input,
  Row,
  Col,
  Button,
  Alert,
} from 'reactstrap';
import React from 'react';
import axios from 'axios';
//prop import
import PropTypes from 'prop-types';

import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { buildSchoolEmbedCode } from '../../../utils/embedCode';

// Contrast checker utility functions
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const getLuminance = (r, g, b) => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const getContrastRatio = (color1, color2) => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return null;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

const ContrastChecker = ({ textColor, bgColor, isLargeText = false }) => {
  const ratio = getContrastRatio(textColor, bgColor);
  
  if (!ratio) return null;
  
  const minRatio = isLargeText ? 3 : 4.5;
  const aaaPassed = ratio >= (isLargeText ? 4.5 : 7);
  const aaPassed = ratio >= minRatio;
  
  let color = 'danger';
  let message = 'Fail';
  
  if (aaaPassed) {
    color = 'success';
    message = 'AAA';
  } else if (aaPassed) {
    color = 'success';
    message = 'AA';
  }
  
  return (
    <div className="mt-2">
      <small className={`text-${color} fw-bold`}>
        Contrast: {ratio.toFixed(2)}:1 - WCAG {message}
        {!aaPassed && <span className="ms-1">⚠️ Insufficient contrast</span>}
      </small>
    </div>
  );
};

function EditStylesTab({
  styles,
  handleStyleChange,
  handleResetStyles,
  baseUrl,
  mapLocations,
  currentInstitution,
  appName,
  token,
  layoutData,
  handleLayoutChange,
}) {
  const [logoPreviewError, setLogoPreviewError] = React.useState(false);
  const [embedWidth, setEmbedWidth] = React.useState('100%');
  const [embedHeight, setEmbedHeight] = React.useState('800');
  const [embedCopied, setEmbedCopied] = React.useState(false);
  const handleSaveStyles = async () => {
    const stylesArray = Object.keys(styles).map((key) => ({
      type: key,
      color_hash: styles[key],
      location: mapLocations,
    }));

    try {
      await axios.post(`${baseUrl}/styling/update-style`, stylesArray, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      alert('Styles saved successfully!');
    } catch (error) {
      console.error('Error saving styles:', error);
      alert('Failed to save styles.');
    }
  };

  const handleSaveLayout = async () => {
    const layoutArray = layoutData.map((item) => ({
      name: item.name,
      text: item.text,
      location: mapLocations,
    }));

    try {
      await axios.put(`${baseUrl}/label/update`, layoutArray, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      alert('Layout data saved successfully!');
    } catch (error) {
      console.error('Error saving layout data:', error);
      alert('Failed to save layout data.');
    }
  };

  const handleSaveAll = async () => {
    await handleSaveStyles();
    await handleSaveLayout();
  };

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'clean']
    ],
  };

  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link'
  ];

  // Add accessible labels to Quill toolbar buttons after component mounts
  React.useEffect(() => {
    const addAccessibleLabels = () => {
      // Add labels to toolbar buttons
      const boldBtn = document.querySelector('.ql-bold');
      if (boldBtn && !boldBtn.getAttribute('aria-label')) {
        boldBtn.setAttribute('aria-label', 'Bold');
      }
      
      const italicBtn = document.querySelector('.ql-italic');
      if (italicBtn && !italicBtn.getAttribute('aria-label')) {
        italicBtn.setAttribute('aria-label', 'Italic');
      }
      
      const underlineBtn = document.querySelector('.ql-underline');
      if (underlineBtn && !underlineBtn.getAttribute('aria-label')) {
        underlineBtn.setAttribute('aria-label', 'Underline');
      }
      
      const strikeBtn = document.querySelector('.ql-strike');
      if (strikeBtn && !strikeBtn.getAttribute('aria-label')) {
        strikeBtn.setAttribute('aria-label', 'Strikethrough');
      }
      
      const orderedListBtn = document.querySelector('.ql-list[value="ordered"]');
      if (orderedListBtn && !orderedListBtn.getAttribute('aria-label')) {
        orderedListBtn.setAttribute('aria-label', 'Ordered List');
      }
      
      const bulletListBtn = document.querySelector('.ql-list[value="bullet"]');
      if (bulletListBtn && !bulletListBtn.getAttribute('aria-label')) {
        bulletListBtn.setAttribute('aria-label', 'Bullet List');
      }
      
      const linkBtn = document.querySelector('.ql-link');
      if (linkBtn && !linkBtn.getAttribute('aria-label')) {
        linkBtn.setAttribute('aria-label', 'Insert Link');
      }

      const cleanBtn = document.querySelector('.ql-clean');
      if (cleanBtn && !cleanBtn.getAttribute('aria-label')) {
        cleanBtn.setAttribute('aria-label', 'Remove Formatting');
      }

      // Label the editor itself
      const editor = document.querySelector('.ql-editor');
      if (editor && !editor.getAttribute('aria-label')) {
        editor.setAttribute('aria-label', 'Footer Text Editor');
        editor.setAttribute('role', 'textbox');
      }

      // Label the toolbar
      const toolbar = document.querySelector('.ql-toolbar');
      if (toolbar && !toolbar.getAttribute('aria-label')) {
        toolbar.setAttribute('aria-label', 'Text Formatting Toolbar');
        toolbar.setAttribute('role', 'toolbar');
      }

      // Hide clipboard from screen readers (internal Quill element)
      const clipboard = document.querySelector('.ql-clipboard');
      if (clipboard && !clipboard.getAttribute('aria-hidden')) {
        clipboard.setAttribute('aria-hidden', 'true');
      }

      // Label the link tooltip input
      const tooltipInput = document.querySelector('.ql-tooltip input[type="text"]');
      if (tooltipInput && !tooltipInput.getAttribute('aria-label')) {
        tooltipInput.setAttribute('aria-label', 'Enter link URL');
      }

      // Label the link preview
      const previewLink = document.querySelector('.ql-preview');
      if (previewLink && !previewLink.getAttribute('aria-label')) {
        previewLink.setAttribute('aria-label', 'Link preview');
      }
    };

    // Run after a short delay to ensure Quill is fully initialized
    const timer = setTimeout(addAccessibleLabels, 100);
    return () => clearTimeout(timer);
  }, []);

  const getLayoutItem = (name) => layoutData.find((item) => item.name === name)?.text || '';


  return (
    <>
      <h2 className="mb-4">Edit Page Styles</h2>
      <Alert color="info" className="mb-4">
        <strong>Accessibility Tip:</strong> Ensure text colors have sufficient contrast against their backgrounds. 
        WCAG AA requires a 4.5:1 ratio for normal text and 3:1 for large text (18pt+). AAA standards require 7:1 and 4.5:1 respectively.
      </Alert>
      <Form>
        <Row>
          <Col md={12}>
            <h4 className="mb-3 mt-2">Header Branding</h4>
            <FormGroup>
              <Label className="fw-bold">Display Mode</Label>
              <div className="d-flex gap-3 mb-3">
                <FormGroup check>
                  <Label check>
                    <Input
                      type="radio"
                      name="headerMode"
                      value="false"
                      checked={getLayoutItem('useLogo') !== 'true'}
                      onChange={() => handleLayoutChange('useLogo', 'false')}
                    />
                    {' '}Use Text
                  </Label>
                </FormGroup>
                <FormGroup check>
                  <Label check>
                    <Input
                      type="radio"
                      name="headerMode"
                      value="true"
                      checked={getLayoutItem('useLogo') === 'true'}
                      onChange={() => handleLayoutChange('useLogo', 'true')}
                    />
                    {' '}Use Logo
                  </Label>
                </FormGroup>
              </div>
            </FormGroup>
          </Col>

          {getLayoutItem('useLogo') === 'true' ? (
            <>
              <Col md={12}>
                <FormGroup>
                  <Label for="logoUrl" className="fw-bold">Logo URL</Label>
                  <Input
                    type="url"
                    name="logoUrl"
                    id="logoUrl"
                    value={getLayoutItem('logoUrl')}
                    onChange={(e) => {
                      handleLayoutChange('logoUrl', e.target.value);
                      setLogoPreviewError(false);
                    }}
                    placeholder="https://example.com/logo.png"
                  />
                  <small className="text-muted d-block mt-1">
                    <i className="bi bi-info-circle me-1"></i>
                    <strong>Recommended:</strong> Use HTTPS URLs for security. Supports PNG, JPG, SVG.
                  </small>
                </FormGroup>
              </Col>
              <Col md={12}>
                <FormGroup>
                  <Label for="logoAlt" className="fw-bold">Logo Alt Text (Accessibility)</Label>
                  <Input
                    type="text"
                    name="logoAlt"
                    id="logoAlt"
                    value={getLayoutItem('logoAlt')}
                    onChange={(e) => handleLayoutChange('logoAlt', e.target.value)}
                    placeholder="e.g., Library Logo"
                  />
                  <small className="text-muted d-block mt-1">
                    <i className="bi bi-info-circle me-1"></i>
                    Describe the logo for screen readers. Required for accessibility.
                  </small>
                </FormGroup>
              </Col>
              <Col md={12}>
                <FormGroup>
                  <Label for="logoHeight" className="fw-bold">
                    Logo Height: {getLayoutItem('logoHeight') || '80'}px
                  </Label>
                  <Input
                    type="range"
                    name="logoHeight"
                    id="logoHeight"
                    min="40"
                    max="120"
                    value={getLayoutItem('logoHeight') || '80'}
                    onChange={(e) => handleLayoutChange('logoHeight', e.target.value)}
                  />
                  <div className="d-flex justify-content-between small text-muted mt-1">
                    <span>40px (Small)</span>
                    <span>80px (Default)</span>
                    <span>120px (Large)</span>
                  </div>
                </FormGroup>
              </Col>
              {getLayoutItem('logoUrl') && (
                <Col md={12}>
                  <FormGroup>
                    <Label className="fw-bold">Logo Preview</Label>
                    <div className="border rounded p-3 bg-light text-center" style={{ minHeight: '120px' }}>
                      {logoPreviewError ? (
                        <div className="text-danger">
                          <i className="bi bi-exclamation-triangle-fill me-2"></i>
                          Unable to load logo. Please check the URL.
                        </div>
                      ) : (
                        <img
                          src={getLayoutItem('logoUrl')}
                          alt={getLayoutItem('logoAlt') || 'Logo preview'}
                          onError={() => setLogoPreviewError(true)}
                          style={{
                            maxHeight: `${getLayoutItem('logoHeight') || '80'}px`,
                            width: 'auto',
                            objectFit: 'contain'
                          }}
                        />
                      )}
                    </div>
                    <small className="text-muted d-block mt-1">
                      This is how your logo will appear on the page at {getLayoutItem('logoHeight') || '80'}px height.
                    </small>
                  </FormGroup>
                </Col>
              )}
            </>
          ) : (
            <Col md={12}>
              <FormGroup>
                <Label for="libraryName" className="fw-bold">Library Name</Label>
                <Input
                  type="text"
                  name="libraryName"
                  id="libraryName"
                  value={getLayoutItem('libraryName')}
                  onChange={(e) => handleLayoutChange('libraryName', e.target.value)}
                />
              </FormGroup>
            </Col>
          )}

          <Col md={12}>
            <hr className="my-4" />
            <h4 className="mb-3">Header Text & Footer</h4>
          </Col>
          <Col md={12}>
            <FormGroup>
              <Label for="headerText">Header Text</Label>
              <Input
                type="textarea"
                name="headerText"
                id="headerText"
                value={getLayoutItem('headerText')}
                onChange={(e) => handleLayoutChange('headerText', e.target.value)}
              />
            </FormGroup>
          </Col>
          <Col md={12}>
            <FormGroup>
              <Label for="headerTextSize" className="fw-bold">
                Header Text Size: {getLayoutItem('headerTextSize') || '3'}rem
              </Label>
              <Input
                type="range"
                name="headerTextSize"
                id="headerTextSize"
                min="2"
                max="5"
                step="0.25"
                value={getLayoutItem('headerTextSize') || '3'}
                onChange={(e) => handleLayoutChange('headerTextSize', e.target.value)}
              />
              <div className="d-flex justify-content-between small text-muted mt-1">
                <span>2rem (Small)</span>
                <span>3rem (Default)</span>
                <span>5rem (Large)</span>
              </div>
            </FormGroup>
          </Col>
          <Col md={12}>
            <FormGroup>
              <Label for="footerText">Footer Text</Label>
              <div id="footer-text-editor">
                <ReactQuill
                  theme="snow"
                  value={getLayoutItem('footerText')}
                  onChange={(content) => handleLayoutChange('footerText', content)}
                  modules={modules}
                  formats={formats}
                  style={{ height: '200px', marginBottom: '50px' }}
                  placeholder="Enter footer text with formatting..."
                  aria-labelledby="footerText"
                />
              </div>
              <small className="form-text text-muted" style={{ display: 'block', marginTop: '60px' }}>
                You can enter plain text or HTML. Use the toolbar above to format text and add links.
              </small>
            </FormGroup>
          </Col>
          <Col md={12}>
            <hr className="my-4" />
            <h4 className="mb-3">Color Scheme</h4>
          </Col>
          <Col md={4}>
            <FormGroup>
              <Label for="headerTextColor">Header Text Color</Label>
              <Input
                type="color"
                name="headerTextColor"
                id="headerTextColor"
                value={styles.headerTextColor}
                onChange={handleStyleChange}
              />
              <ContrastChecker 
                textColor={styles.headerTextColor} 
                bgColor={styles.backgroundColor}
                isLargeText={false}
              />
              <small className="text-muted d-block mt-1">
                Used for library name (small text) and main heading (large text). Must meet 4.5:1 for accessibility.
              </small>
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup>
              <Label for="titleColor">Title Color</Label>
              <Input
                type="color"
                name="titleColor"
                id="titleColor"
                value={styles.titleColor}
                onChange={handleStyleChange}
              />
              <ContrastChecker 
                textColor={styles.titleColor} 
                bgColor="#ffffff"
                isLargeText={false}
              />
              <small className="text-muted d-block mt-1">
                Checked against white card background. Titles appear on white cards.
              </small>
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup>
              <Label for="descriptionColor">Description Color</Label>
              <Input
                type="color"
                name="descriptionColor"
                id="descriptionColor"
                value={styles.descriptionColor}
                onChange={handleStyleChange}
              />
              <ContrastChecker 
                textColor={styles.descriptionColor} 
                bgColor="#ffffff"
                isLargeText={false}
              />
              <small className="text-muted d-block mt-1">
                Checked against white card background. Descriptions appear on white cards.
              </small>
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup>
              <Label for="footer">Footer Text Color</Label>
              <Input
                type="color"
                name="footer"
                id="footer"
                value={styles.footer}
                onChange={handleStyleChange}
              />
              <ContrastChecker 
                textColor={styles.footer} 
                bgColor={styles.footerBackgroundColor}
                isLargeText={false}
              />
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup>
              <Label for="footerBackgroundColor">Footer Background Color</Label>
              <Input
                type="color"
                name="footerBackgroundColor"
                id="footerBackgroundColor"
                value={styles.footerBackgroundColor}
                onChange={handleStyleChange}
              />
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup>
              <Label for="backgroundColor">Background Color</Label>
              <Input
                type="color"
                name="backgroundColor"
                id="backgroundColor"
                value={styles.backgroundColor}
                onChange={handleStyleChange}
              />
            </FormGroup>
          </Col>
        </Row>

        {/* Embed Code Generator Section */}
        <Row className="mt-5">
          <Col md={12}>
            <hr className="my-4" />
            <h4 className="mb-3">Embed on Your Website</h4>
            <Alert color="info" className="mb-3">
              <i className="bi bi-code-square me-2"></i>
              <strong>How to use:</strong> Copy the code below and paste it into your website where you want the {appName} page to appear.
            </Alert>
          </Col>
          
          <Col md={6}>
            <FormGroup>
              <Label for="embedWidth" className="fw-bold">Width</Label>
              <Input
                type="text"
                name="embedWidth"
                id="embedWidth"
                value={embedWidth}
                onChange={(e) => setEmbedWidth(e.target.value)}
                placeholder="100% or 1200px"
              />
              <small className="text-muted d-block mt-1">
                Can be percentage (100%) or pixels (1200px)
              </small>
            </FormGroup>
          </Col>

          <Col md={6}>
            <FormGroup>
              <Label for="embedHeight" className="fw-bold">Height (pixels)</Label>
              <Input
                type="number"
                name="embedHeight"
                id="embedHeight"
                value={embedHeight}
                onChange={(e) => setEmbedHeight(e.target.value)}
                placeholder="800"
              />
              <small className="text-muted d-block mt-1">
                Recommended: 800px or higher
              </small>
            </FormGroup>
          </Col>

          <Col md={12}>
            <FormGroup>
              <Label className="fw-bold d-flex justify-content-between align-items-center">
                <span>Embed Code</span>
                <Button
                  color="success"
                  size="sm"
                  onClick={() => {
                    const schoolPath = currentInstitution?.slug || '';
                    const embedCode = buildSchoolEmbedCode({
                      origin: window.location.origin,
                      basePath: import.meta.env.BASE_URL,
                      schoolPath,
                      width: embedWidth,
                      height: embedHeight,
                      title: `${appName} - ${mapLocations}`,
                    });
                    navigator.clipboard.writeText(embedCode);
                    setEmbedCopied(true);
                    setTimeout(() => setEmbedCopied(false), 2000);
                  }}
                  className="d-flex align-items-center gap-2"
                >
                  <i className={`bi ${embedCopied ? 'bi-check-circle-fill' : 'bi-clipboard'}`}></i>
                  {embedCopied ? 'Copied!' : 'Copy Code'}
                </Button>
              </Label>
              <div className="position-relative">
                <Input
                  type="textarea"
                  rows="4"
                  readOnly
                  value={(() => {
                    const schoolPath = currentInstitution?.slug || '';
                    return buildSchoolEmbedCode({
                      origin: window.location.origin,
                      basePath: import.meta.env.BASE_URL,
                      schoolPath,
                      width: embedWidth,
                      height: embedHeight,
                      title: `${appName} - ${mapLocations}`,
                    });
                  })()}
                  className="font-monospace small"
                  style={{ backgroundColor: '#f8f9fa' }}
                />
              </div>
              <small className="text-muted d-block mt-2">
                <i className="bi bi-info-circle me-1"></i>
                This code creates an embedded window showing your {appName} page. The page will automatically update when you make changes.
              </small>
            </FormGroup>
          </Col>

          <Col md={12}>
            <Alert color="warning" className="mb-0">
              <strong><i className="bi bi-lightbulb me-2"></i>Tips for embedding:</strong>
              <ul className="mb-0 mt-2">
                <li>Ensure your website supports iframe embedding</li>
                <li>Set the width to 100% for responsive design</li>
                <li>Adjust the height based on your content - you may need more than 800px if you have many items</li>
                <li>The embedded page will respect all your color and style settings</li>
                <li>Users can interact with the embedded page (search, filter, view items) without leaving your site</li>
              </ul>
            </Alert>
          </Col>
        </Row>
      </Form>
      <div className="mt-3 d-flex flex-wrap gap-2">
        <Button color="primary" onClick={handleSaveAll} className="mb-2">
          Save Changes
        </Button>
        <Button color="secondary" onClick={handleResetStyles} className="mb-2">
          Reset Styles
        </Button>
      </div>
    </>
  );
}

export default EditStylesTab;

ContrastChecker.propTypes = {
  textColor: PropTypes.string.isRequired,
  bgColor: PropTypes.string.isRequired,
  isLargeText: PropTypes.bool,
};

EditStylesTab.propTypes = {
  styles: PropTypes.object.isRequired,
  handleStyleChange: PropTypes.func.isRequired,
  handleResetStyles: PropTypes.func.isRequired,
  baseUrl: PropTypes.string.isRequired,
  mapLocations: PropTypes.string.isRequired,
  currentInstitution: PropTypes.object,
  appName: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
  layoutData: PropTypes.array.isRequired,
  handleLayoutChange: PropTypes.func.isRequired,
};
