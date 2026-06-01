import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Alert, Badge, Spinner } from 'reactstrap';

const severityColor = {
  pass: 'success',
  warning: 'warning',
  fail: 'danger',
};

const severityLabel = {
  pass: 'Pass',
  warning: 'Warning',
  fail: 'Fail',
};

function SetupHealthTab({ baseUrl, token }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');

    if (!token) {
      setError('Unable to load setup health. System administrator access is required.');
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    axios
      .get(`${baseUrl}/settings/preflight`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        if (!cancelled) {
          setReport(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load setup health. System administrator access is required.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [baseUrl, token]);

  const summaryColor = useMemo(
    () => severityColor[report?.summary?.status] || 'secondary',
    [report]
  );

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2">
        <Spinner size="sm" />
        <span>Loading setup health...</span>
      </div>
    );
  }

  if (error) {
    return <Alert color="danger">{error}</Alert>;
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="h5 mb-1">Setup Health</h2>
          <p className="text-muted mb-0">Review configuration items before sharing this deployment.</p>
        </div>
        <Badge color={summaryColor} pill>
          {report?.summary?.failures || 0} failed / {report?.summary?.warnings || 0} warnings /{' '}
          {report?.summary?.passes || 0} passed
        </Badge>
      </div>

      {(report?.groups || []).map((group) => (
        <section className="mb-4" key={group.key}>
          <h3 className="h6 text-uppercase text-muted">{group.label}</h3>
          <div className="list-group">
            {(group.items || []).map((item) => (
              <div className="list-group-item" key={item.key}>
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div>
                    <div className="fw-semibold">{item.label}</div>
                    <div className="text-muted small">{item.message}</div>
                    <code className="small">{item.field}</code>
                  </div>
                  <Badge color={severityColor[item.severity] || 'secondary'}>
                    {severityLabel[item.severity] || item.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

SetupHealthTab.propTypes = {
  baseUrl: PropTypes.string.isRequired,
  token: PropTypes.string,
};

export default SetupHealthTab;
