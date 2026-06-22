import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  FormGroup,
  Input,
  Label,
  Row,
  Table,
} from 'reactstrap';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { fetchFilterGroups, saveFilterGroups } from '../../../api/filterOptions';
import { slugifyFilterValue } from '../../../utils/customFilters';

const newId = () => `new-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function prepareGroupsForSave(groups) {
  return groups.map((group, groupIndex) => ({
    id: typeof group.id === 'number' ? group.id : null,
    name: group.name.trim(),
    slug: group.slug || slugifyFilterValue(group.name),
    sort_order: groupIndex + 1,
    is_active: group.is_active !== false,
    options: (group.options || []).map((option, optionIndex) => ({
      id: typeof option.id === 'number' ? option.id : null,
      name: option.name.trim(),
      slug: option.slug || slugifyFilterValue(option.name),
      sort_order: optionIndex + 1,
      is_active: option.is_active !== false,
    })),
  })).filter((group) => group.name);
}

function FilterOptionsTab({ baseUrl, token, mapLocations, onFiltersChanged }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const activeOptionCount = useMemo(() => groups.reduce((total, group) => (
    total + (group.options || []).filter((option) => option.is_active !== false).length
  ), 0), [groups]);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFilterGroups(baseUrl, mapLocations, token, { includeInactive: true });
      setGroups(data.map((group) => ({
        ...group,
        options: Array.isArray(group.options) ? group.options : [],
      })));
      setHasChanges(false);
    } catch (error) {
      console.log('Filter option endpoint is not available yet:', error);
      setGroups([]);
      setHasChanges(false);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, mapLocations, token]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const updateGroup = (groupId, updates) => {
    setGroups((previous) => previous.map((group) => (
      group.id === groupId ? { ...group, ...updates } : group
    )));
    setHasChanges(true);
  };

  const updateOption = (groupId, optionId, updates) => {
    setGroups((previous) => previous.map((group) => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        options: group.options.map((option) => (
          option.id === optionId ? { ...option, ...updates } : option
        )),
      };
    }));
    setHasChanges(true);
  };

  const addGroup = () => {
    setGroups((previous) => [
      ...previous,
      { id: newId(), name: '', slug: '', sort_order: previous.length + 1, is_active: true, options: [] },
    ]);
    setHasChanges(true);
  };

  const addOption = (groupId) => {
    setGroups((previous) => previous.map((group) => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        options: [
          ...group.options,
          { id: newId(), name: '', slug: '', sort_order: group.options.length + 1, is_active: true },
        ],
      };
    }));
    setHasChanges(true);
  };

  const removeGroup = (groupId) => {
    setGroups((previous) => previous.filter((group) => group.id !== groupId));
    setHasChanges(true);
  };

  const removeOption = (groupId, optionId) => {
    setGroups((previous) => previous.map((group) => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        options: group.options.filter((option) => option.id !== optionId),
      };
    }));
    setHasChanges(true);
  };

  const moveGroup = (groupId, direction) => {
    setGroups((previous) => {
      const index = previous.findIndex((group) => group.id === groupId);
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= previous.length) return previous;
      const next = [...previous];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
    setHasChanges(true);
  };

  const moveOption = (groupId, optionId, direction) => {
    setGroups((previous) => previous.map((group) => {
      if (group.id !== groupId) return group;
      const index = group.options.findIndex((option) => option.id === optionId);
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= group.options.length) return group;
      const nextOptions = [...group.options];
      const [moved] = nextOptions.splice(index, 1);
      nextOptions.splice(nextIndex, 0, moved);
      return { ...group, options: nextOptions };
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const payload = prepareGroupsForSave(groups);

    if (payload.some((group) => group.options.some((option) => !option.name))) {
      toast.warning('Remove blank options before saving.');
      return;
    }

    setSaving(true);
    try {
      const savedGroups = await saveFilterGroups(baseUrl, mapLocations, payload, token, { includeInactive: true });
      setGroups(savedGroups);
      setHasChanges(false);
      onFiltersChanged();
      toast.success('Filter options saved.');
    } catch (error) {
      console.error('Failed to save filter options:', error);
      toast.error('Failed to save filter options. Backend endpoint may not be implemented yet.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading filter options...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="filter-options-tab">
      {hasChanges && (
        <Alert color="warning" className="d-flex justify-content-between align-items-center">
          <span><i className="bi bi-exclamation-triangle me-2"></i>You have unsaved filter option changes.</span>
          <div className="d-flex gap-2">
            <Button color="secondary" size="sm" onClick={loadGroups}>Reset</Button>
            <Button color="success" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Alert>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 className="h4 mb-1">Custom Filter Options</h2>
          <div className="text-muted small">
            {groups.length} groups, {activeOptionCount} active options for {mapLocations}
          </div>
        </div>
        <Button color="primary" onClick={addGroup}>
          <i className="bi bi-plus-lg me-2" aria-hidden="true"></i>Add Filter Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card className="border-dashed">
          <CardBody className="text-center py-5">
            <h3 className="h5">No custom filters yet</h3>
            <p className="text-muted mb-3">Create a group such as Collections, then add options that can be assigned to inventory items.</p>
            <Button color="primary" onClick={addGroup}>Create First Group</Button>
          </CardBody>
        </Card>
      ) : (
        <div className="d-flex flex-column gap-4">
          {groups.map((group, groupIndex) => (
            <Card key={group.id} className={group.is_active === false ? 'opacity-75' : ''}>
              <CardBody>
                <Row className="g-3 align-items-end mb-3">
                  <Col md={5}>
                    <FormGroup>
                      <Label className="fw-bold">Group Name</Label>
                      <Input
                        value={group.name}
                        placeholder="Collections"
                        onChange={(event) => updateGroup(group.id, { name: event.target.value, slug: slugifyFilterValue(event.target.value) })}
                      />
                    </FormGroup>
                  </Col>
                  <Col md={3}>
                    <FormGroup>
                      <Label>URL Slug</Label>
                      <Input value={group.slug || slugifyFilterValue(group.name)} readOnly />
                    </FormGroup>
                  </Col>
                  <Col md={4}>
                    <div className="d-flex justify-content-end gap-2 mb-3">
                      <Button color="light" size="sm" onClick={() => moveGroup(group.id, 'up')} disabled={groupIndex === 0} title="Move group up">
                        <i className="bi bi-arrow-up" aria-hidden="true"></i>
                      </Button>
                      <Button color="light" size="sm" onClick={() => moveGroup(group.id, 'down')} disabled={groupIndex === groups.length - 1} title="Move group down">
                        <i className="bi bi-arrow-down" aria-hidden="true"></i>
                      </Button>
                      <Button
                        color={group.is_active === false ? 'outline-success' : 'outline-secondary'}
                        size="sm"
                        onClick={() => updateGroup(group.id, { is_active: group.is_active === false })}
                      >
                        {group.is_active === false ? 'Enable' : 'Disable'}
                      </Button>
                      <Button color="outline-danger" size="sm" onClick={() => removeGroup(group.id)}>
                        Delete
                      </Button>
                    </div>
                  </Col>
                </Row>

                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="fw-bold">Options</div>
                  <Button color="outline-primary" size="sm" onClick={() => addOption(group.id)}>
                    <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>Add Option
                  </Button>
                </div>

                <Table responsive size="sm" className="align-middle">
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Name</th>
                      <th>Slug</th>
                      <th style={{ width: '100px' }}>Status</th>
                      <th className="text-end" style={{ width: '190px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.options.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-muted text-center py-3">No options in this group yet.</td>
                      </tr>
                    ) : group.options.map((option, optionIndex) => (
                      <tr key={option.id} className={option.is_active === false ? 'text-muted' : ''}>
                        <td>
                          <Input
                            value={option.name}
                            placeholder="MH Media Resources"
                            onChange={(event) => updateOption(group.id, option.id, { name: event.target.value, slug: slugifyFilterValue(event.target.value) })}
                          />
                        </td>
                        <td><code>{option.slug || slugifyFilterValue(option.name)}</code></td>
                        <td>
                          <Badge color={option.is_active === false ? 'secondary' : 'success'} pill>
                            {option.is_active === false ? 'Hidden' : 'Active'}
                          </Badge>
                        </td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            <Button color="light" size="sm" onClick={() => moveOption(group.id, option.id, 'up')} disabled={optionIndex === 0} title="Move option up">
                              <i className="bi bi-arrow-up" aria-hidden="true"></i>
                            </Button>
                            <Button color="light" size="sm" onClick={() => moveOption(group.id, option.id, 'down')} disabled={optionIndex === group.options.length - 1} title="Move option down">
                              <i className="bi bi-arrow-down" aria-hidden="true"></i>
                            </Button>
                            <Button
                              color={option.is_active === false ? 'outline-success' : 'outline-secondary'}
                              size="sm"
                              onClick={() => updateOption(group.id, option.id, { is_active: option.is_active === false })}
                            >
                              {option.is_active === false ? 'Enable' : 'Hide'}
                            </Button>
                            <Button color="outline-danger" size="sm" onClick={() => removeOption(group.id, option.id)}>
                              <i className="bi bi-trash" aria-hidden="true"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

FilterOptionsTab.propTypes = {
  baseUrl: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
  mapLocations: PropTypes.string.isRequired,
  onFiltersChanged: PropTypes.func.isRequired,
};

export default FilterOptionsTab;
