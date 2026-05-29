import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import useSchoolStore from '../store/schoolStore';

function RequestAccess() {
  const { appConfig, baseUrl, loadConfig } = useSchoolStore();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Libraries');
  const [school, setSchool] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadConfig().catch((error) => console.error('Unable to load app configuration', error));
  }, [loadConfig]);

  const allowedDomains = useMemo(() => (
    (appConfig.institutions || []).flatMap((institution) => institution.emailDomains || [])
  ), [appConfig.institutions]);
  const requestAccess = appConfig.requestAccess || {};
  const deployment = appConfig.deployment || {};
  const showAffiliationSelector = requestAccess.showAffiliationSelector !== false;
  const primaryInstitutionSlug = deployment.primaryInstitutionSlug || appConfig.institutions?.[0]?.slug || '';

  useEffect(() => {
    if (!showAffiliationSelector && primaryInstitutionSlug && !school) {
      setSchool(primaryInstitutionSlug);
    }
  }, [primaryInstitutionSlug, school, showAffiliationSelector]);

  // Helper function to validate email domain
  const validateEmail = (email) => {
    const domain = email.split('@')[1];
    return allowedDomains.length === 0 || allowedDomains.includes(domain);
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    // Check if email is valid and from an allowed domain
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = `Email must be from an approved domain${allowedDomains.length ? `: ${allowedDomains.join(', ')}` : ''}`;
    }

    // Check if full name is provided
    if (!fullName) {
      newErrors.fullName = 'Full name is required';
    }

    // Check if school is selected
    if (showAffiliationSelector && !school) {
      newErrors.school = 'You must select an affiliation';
    }

    setErrors(newErrors);

    // Return true if no errors
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Validate form fields
    if (!validateForm()) {
      return;
    }
  
    // Prepare data to send
    const formData = new URLSearchParams();
    formData.append('email', email);
    formData.append('fullName', fullName);
    formData.append('department', department);
    formData.append('role', 'staff');
    formData.append('school', school);
  
    try {
      const response = await fetch(`${baseUrl}/request-access/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
  
      const result = await response.json();
  
      if (result.success) {
        setSubmitted(true);
        toast.success('Request submitted successfully');
      } else {
        // Handle backend validation errors
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('An error occurred while submitting the form.');
    }
  };

  return (
    <main className="container mt-5">
      <h1 className="h2 mb-4">Request Access</h1>
      {submitted ? (
        <div className="alert alert-success">
          <p>Thank you for your request. It will be reviewed and an email will be sent once your account is activated.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email:
            </label>
            <input
              type="email"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {errors.email && <div className="invalid-feedback">{errors.email}</div>}
          </div>

          <div className="mb-3">
            <label htmlFor="fullName" className="form-label">
              Full Name:
            </label>
            <input
              type="text"
              className={`form-control ${errors.fullName ? 'is-invalid' : ''}`}
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            {errors.fullName && <div className="invalid-feedback">{errors.fullName}</div>}
          </div>

          <div className="mb-3">
            <label htmlFor="department" className="form-label">
              Department:
            </label>
            <select
              className="form-select"
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">Select a department</option>  
              <option value="Libraries">Libraries</option>
              <option value="IT">IT</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {showAffiliationSelector ? (
            <div className="mb-3">
              <label htmlFor="school" className="form-label">
                {requestAccess.affiliationPrompt || 'Where are you from?'}
              </label>
              <select
                className={`form-select ${errors.school ? 'is-invalid' : ''}`}
                id="school"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                required
              >
                <option value="">Select an affiliation</option>
                {(appConfig.institutions || []).map((institution) => (
                  <option key={institution.slug} value={institution.slug}>{institution.name}</option>
                ))}
              </select>
              {errors.school && <div className="invalid-feedback">{errors.school}</div>}
            </div>
          ) : null}

          <button type="submit" className="btn btn-primary">
            Submit
          </button>
        </form>
      )}
    </main>
  );
}

export default RequestAccess;
