import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button, Card, CardBody, Form, FormGroup, Input, Label } from 'reactstrap';
import { toast } from 'react-toastify';
import useSchoolStore from '../store/schoolStore';

function ResetPassword() {
  const { baseUrl, appConfig } = useSchoolStore();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);
  const token = searchParams.get('token') || '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 12) {
      toast.error('Password must be at least 12 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${baseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.name || 'Unable to reset password.');
      }
      setComplete(true);
      toast.success('Password reset.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container d-flex align-items-center justify-content-center">
      <Card style={{ maxWidth: '480px', width: '100%' }}>
        <CardBody>
          <h1 className="h4 mb-3">{appConfig.appName || 'Library Equipment'} Password Reset</h1>
          {complete ? (
            <>
              <p>Your password has been reset.</p>
              <Link to="/">Return to login</Link>
            </>
          ) : (
            <Form onSubmit={handleSubmit}>
              <FormGroup>
                <Label for="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  disabled={!token}
                />
              </FormGroup>
              <FormGroup>
                <Label for="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  disabled={!token}
                />
              </FormGroup>
              {!token && <p className="text-danger">Password reset token is missing.</p>}
              <Button color="primary" type="submit" disabled={saving || !token}>
                {saving ? 'Resetting...' : 'Reset Password'}
              </Button>
            </Form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default ResetPassword;
