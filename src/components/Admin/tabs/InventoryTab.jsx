import {
  Row, Col, Card, CardBody, CardTitle, Button, Input, FormGroup, Label, Modal, ModalHeader, ModalBody, ModalFooter, Table, ButtonGroup
} from 'reactstrap';
import PropTypes from 'prop-types';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'react-toastify';
import { Filter, Pencil, Plus, Trash2 } from 'lucide-react';
import { branches } from '../../../data/branches';
import SearchableSelect from '../../Common/SearchableSelect';
import MultiSelectFilter from '../../Common/MultiSelectFilter';
import AddItemModal from '../modals/AddItemModal';
import {
  getApiErrorMessage,
  getImageUploadError,
} from '../../../utils/adminImageUploads';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ReactQuill toolbar configuration
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link'],
    ['clean']
  ],
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'link'
];

const stripHtml = (html) => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html || '';
  return tmp.textContent || tmp.innerText || '';
};

const imageFormats = ['jpg', 'jpeg', 'png', 'gif'];

const checkImageFormat = async (folioId) => {
  for (let format of imageFormats) {
    const imageUrl = `https://libtools2.smith.edu/gadgets-to-go/backend/images/${folioId}.${format}`;
    try {
      const response = await axios.get(imageUrl);
      if (response.status === 200) return imageUrl;
    } catch (error) { continue; }
  }
  return null;
};

function InventoryTab({ inventoryData, styles, baseUrl, token, refreshInventory, mapLocations, filterGroups = [] }) {
  const [viewMode, setViewMode] = useState('list');
  const [groupMode, setGroupMode] = useState(false); // New: Group by Branch
  const [editableItem, setEditableItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imageSrcs, setImageSrcs] = useState({});
  const editImageInputRef = useRef(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- Advanced Sorting & Reordering State ---
  const [localInventory, setLocalInventory] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'default', direction: 'asc' }); // { key: 'default'|'title'|'branch'|'branch_priority', direction: 'asc'|'desc' }
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [movePosition, setMovePosition] = useState('after'); // 'before', 'after'
  const [isBulkFilterModalOpen, setIsBulkFilterModalOpen] = useState(false);
  const [bulkFilterOptionIds, setBulkFilterOptionIds] = useState([]);
  const [replaceExistingFilters, setReplaceExistingFilters] = useState(false);

  // Custom Branch Sort State
  const [customBranchOrder, setCustomBranchOrder] = useState([]);
  const [isBranchOrderModalOpen, setIsBranchOrderModalOpen] = useState(false);

  // Initialize custom branch order from filtered branches once
  useEffect(() => {
    // If not defined, fallback to all branches. 
    // In SchoolPage context, we have filteredBranches props or similar, but here we only have mapLocations or inventoryData.
    // Let's derive branches from inventoryData if needed, or just use 'branches' data import.
    // Using filtered branches based on active items in view is safer.
    if (customBranchOrder.length === 0) {
      // Filter branches that actually have items (or utilize the `branches` import directly if available)
      const activeCodes = new Set();
      inventoryData.forEach(i => {
        const branchList = Array.isArray(i.branches) ? i.branches : (i.branch ? [i.branch] : []);
        branchList.forEach(b => activeCodes.add(b));
      });
      const initialOrder = branches.filter(b => activeCodes.has(b.code));
      // Fallback to all if none active? No, just show active. Or show all from 'branches' to be safe.
      // Let's show all matching the current school prefix if mapLocations is set, effectively re-implementing 'getFilteredBranches' logic if needed,
      // But 'branches' import + generic filter is robust enough.
      setCustomBranchOrder(initialOrder.length > 0 ? initialOrder : branches);
    }
  }, [inventoryData, customBranchOrder.length]);

  const toggleSearchModal = () => setIsSearchModalOpen(!isSearchModalOpen);
  const toggleEditModal = () => {
    setIsEditModalOpen(!isEditModalOpen);
    if (isEditModalOpen) {
      setEditableItem(null);
      setFormData({});
      setImageFile(null);
    }
  };

  // Add accessible labels to ReactQuill toolbar buttons after edit modal opens
  useEffect(() => {
    if (!isEditModalOpen) return;
    
    const addAccessibleLabels = () => {
      // Add labels to toolbar buttons
      const headerButtons = document.querySelectorAll('.ql-header');
      headerButtons.forEach((btn) => {
        if (!btn.getAttribute('aria-label')) {
          const value = btn.getAttribute('value');
          if (value === '1') btn.setAttribute('aria-label', 'Heading 1');
          else if (value === '2') btn.setAttribute('aria-label', 'Heading 2');
          else if (value === '3') btn.setAttribute('aria-label', 'Heading 3');
          else btn.setAttribute('aria-label', 'Normal text');
        }
      });
      
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
      const editors = document.querySelectorAll('.ql-editor');
      editors.forEach((editor) => {
        if (!editor.getAttribute('aria-label')) {
          editor.setAttribute('aria-label', 'Item Description Editor');
          editor.setAttribute('role', 'textbox');
        }
      });

      // Label the toolbar
      const toolbars = document.querySelectorAll('.ql-toolbar');
      toolbars.forEach((toolbar) => {
        if (!toolbar.getAttribute('aria-label')) {
          toolbar.setAttribute('aria-label', 'Text Formatting Toolbar');
          toolbar.setAttribute('role', 'toolbar');
        }
      });
    };

    // Run after a short delay to ensure Quill is fully initialized
    const timer = setTimeout(addAccessibleLabels, 100);
    return () => clearTimeout(timer);
  }, [isEditModalOpen]);

  // Initialize local inventory from props
  useEffect(() => {
    // Only reset if no unsaved changes to prevent overwriting work
    if (!hasUnsavedChanges) {
      setLocalInventory([...inventoryData].sort((a, b) => a.sort_order - b.sort_order));
    }
  }, [inventoryData, hasUnsavedChanges]);

  // Handle Sort Toggle
  const handleSortBy = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key) direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });

    let sorted = [...localInventory];
    const modifier = direction === 'asc' ? 1 : -1;

    if (key === 'title') {
      sorted.sort((a, b) => modifier * a.title.localeCompare(b.title));
    } else if (key === 'branch') {
      sorted.sort((a, b) => {
        const aBranch = Array.isArray(a.branches) && a.branches.length > 0 ? a.branches[0] : (a.branch || '');
        const bBranch = Array.isArray(b.branches) && b.branches.length > 0 ? b.branches[0] : (b.branch || '');
        return modifier * aBranch.localeCompare(bBranch);
      });
    } else if (key === 'branch_priority') {
      // Use Custom Branch Order
      const branchIndex = customBranchOrder.reduce((acc, b, idx) => ({ ...acc, [b.code]: idx }), {});
      sorted.sort((a, b) => {
        const aBranch = Array.isArray(a.branches) && a.branches.length > 0 ? a.branches[0] : a.branch;
        const bBranch = Array.isArray(b.branches) && b.branches.length > 0 ? b.branches[0] : b.branch;
        const ia = branchIndex[aBranch] ?? 999;
        const ib = branchIndex[bBranch] ?? 999;
        return modifier * (ia - ib);
      });
    } else {
      sorted.sort((a, b) => a.sort_order - b.sort_order);
    }

    setLocalInventory(sorted);
    if (key !== 'default') setHasUnsavedChanges(true); // Sorting makes the list unsaved if not default
  };

  // Move Branch Config Up/Down
  const moveBranchConfig = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= customBranchOrder.length) return;

    const newOrder = [...customBranchOrder];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(newIndex, 0, moved);
    setCustomBranchOrder(newOrder);
  };

  const applyBranchOrder = () => {
    setIsBranchOrderModalOpen(false);
    // Re-trigger sort if currently sorting by branch priority
    if (sortConfig.key === 'branch_priority') {
      handleSortBy('branch_priority'); // This re-sorts using the new order but might toggle direction if not careful.
      // Better: Explicitly call sort with current config... but simplest is to just re-trigger for now.
      // Actually handleSortBy toggles direction. We should separate generic sort function from handler.
      // For now, let's just force a re-sort manually here to avoid toggle side effect.
      const modifier = sortConfig.direction === 'asc' ? 1 : -1;
      const branchIndex = customBranchOrder.reduce((acc, b, idx) => ({ ...acc, [b.code]: idx }), {});
      let sorted = [...localInventory].sort((a, b) => {
        const aBranch = Array.isArray(a.branches) && a.branches.length > 0 ? a.branches[0] : a.branch;
        const bBranch = Array.isArray(b.branches) && b.branches.length > 0 ? b.branches[0] : b.branch;
        const ia = branchIndex[aBranch] ?? 999;
        const ib = branchIndex[bBranch] ?? 999;
        return modifier * (ia - ib);
      });
      setLocalInventory(sorted);
    }
  };

  // Selection Checkbox
  const toggleSelection = (id) => {
    setSelectedItemIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Batch Move Logic
  const openMoveModal = () => setIsMoveModalOpen(true);
  const handleBatchMove = () => {
    if (!moveTargetId || selectedItemIds.length === 0) return;

    // Find target in localInventory
    const targetIndex = localInventory.findIndex(i => i.id === parseInt(moveTargetId));
    if (targetIndex === -1) return;

    // Filter items
    const itemsToMove = localInventory.filter(i => selectedItemIds.includes(i.id));
    const remaining = localInventory.filter(i => !selectedItemIds.includes(i.id));

    // Calculate insert position in *remaining* list
    const newTargetIndex = remaining.findIndex(i => i.id === parseInt(moveTargetId));
    const insertIndex = movePosition === 'after' ? newTargetIndex + 1 : newTargetIndex;

    remaining.splice(insertIndex, 0, ...itemsToMove);

    setLocalInventory(remaining);
    setHasUnsavedChanges(true);
    setSelectedItemIds([]);
    setIsMoveModalOpen(false);
  };

  // Save Order to Server
  const handleSaveOrder = async () => {
    try {
      const updates = localInventory.map((item, index) => ({
        id: item.id,
        sort_order: index + 1,
        // original_order could be checked here to filter
      }));

      // Optimization: Only send changed items?
      // For now, simpler to send all in batch logic block or loop.
      // We will loop update requests as implemented before.

      const promises = updates.map(u => {
        const original = inventoryData.find(i => i.id === u.id);
        // Only update if sort_order changed
        if (original && original.sort_order === u.sort_order) return Promise.resolve();

        const f = new FormData();
        f.append('title', original.title);
        f.append('description', original.description);
        f.append('owner', original.owner);
        // Preserve branches array
        const branches = Array.isArray(original.branches) ? original.branches : (original.branch ? [original.branch] : []);
        if (branches.length > 0) {
          branches.forEach(branch => f.append('branches[]', branch));
        }
        const filterOptionIds = Array.isArray(original.filter_option_ids) ? original.filter_option_ids : [];
        filterOptionIds.forEach(id => f.append('filter_option_ids[]', id));
        f.append('folio_id', original.folio_id);
        f.append('sort_order', u.sort_order);

        return axios.post(`${baseUrl}/inventory/update/${u.id}`, f, {
          headers: { Authorization: `Bearer ${token}` }
        });
      });

      await Promise.all(promises);
      toast.success('Inventory order updated.');
      setHasUnsavedChanges(false);
      refreshInventory();
    } catch (error) {
      console.error('Save failed', error);
      toast.error('Failed to save order.');
    }
  };


  useEffect(() => {
    const missingItems = inventoryData.filter((item) => (
      !Object.prototype.hasOwnProperty.call(imageSrcs, item.id)
    ));
    if (missingItems.length === 0) return undefined;

    let cancelled = false;
    const loadImages = async () => {
      const srcs = {};
      for (let item of missingItems) {
        const imageUrl = await checkImageFormat(item.folio_id);
        srcs[item.id] = imageUrl;
      }
      if (!cancelled) setImageSrcs(prev => ({ ...prev, ...srcs }));
    };
    loadImages();
    return () => { cancelled = true; };
  }, [inventoryData, imageSrcs]);

  const openEditModal = (item) => {
    setEditableItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      sort_order: item.sort_order,
      owner: item.owner,
      branches: Array.isArray(item.branches) ? item.branches : (item.branch ? [item.branch] : []), // Handle both old and new format
      filterOptionIds: Array.isArray(item.filter_option_ids)
        ? item.filter_option_ids.map(Number)
        : (Array.isArray(item.custom_filters) ? item.custom_filters.map(filter => Number(filter.id)) : [])
    });
    setIsEditModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDescriptionChange = (value) => {
    setFormData(prev => ({ ...prev, description: value }));
  };

  const handleBranchChange = (value) => {
    // Add branch if not already in array
    if (value && !formData.branches.includes(value)) {
      setFormData(prev => ({ ...prev, branches: [...prev.branches, value] }));
    }
  };

  const handleRemoveBranch = (branchToRemove) => {
    setFormData(prev => ({
      ...prev,
      branches: prev.branches.filter(b => b !== branchToRemove)
    }));
  }

  const handleFilterGroupChange = (group, selectedOptionIds) => {
    const groupOptionIds = new Set(group.options.map(option => Number(option.id)));
    setFormData(prev => {
      const existingOtherGroupIds = (prev.filterOptionIds || []).filter(id => !groupOptionIds.has(Number(id)));
      return {
        ...prev,
        filterOptionIds: [...existingOtherGroupIds, ...selectedOptionIds.map(Number)],
      };
    });
  };

  const handleBulkFilterGroupChange = (group, selectedOptionIds) => {
    const groupOptionIds = new Set(group.options.map(option => Number(option.id)));
    setBulkFilterOptionIds(previous => {
      const otherGroupIds = previous.filter(id => !groupOptionIds.has(Number(id)));
      return [...otherGroupIds, ...selectedOptionIds.map(Number)];
    });
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    const validationError = getImageUploadError(file);
    if (validationError) {
      event.target.value = '';
      setImageFile(null);
      toast.error(validationError);
      return;
    }
    setImageFile(file);
  };

  const handleUpdate = async () => {
    if (!editableItem) return;

    const validationError = getImageUploadError(imageFile);
    if (validationError) {
      setImageFile(null);
      if (editImageInputRef.current) editImageInputRef.current.value = '';
      toast.error(validationError);
      return;
    }

    try {
      const form = new FormData();
      form.append('title', formData.title);
      form.append('description', formData.description);
      form.append('sort_order', editableItem.sort_order); // Keep existing sort order
      form.append('owner', formData.owner);
      // Send branches as array
      if (Array.isArray(formData.branches) && formData.branches.length > 0) {
        formData.branches.forEach(branch => form.append('branches[]', branch));
      }
      if (Array.isArray(formData.filterOptionIds) && formData.filterOptionIds.length > 0) {
        formData.filterOptionIds.forEach(id => form.append('filter_option_ids[]', id));
      }
      form.append('folio_id', editableItem.folio_id);
      form.append('aleph_id', editableItem.aleph_id || '');

      if (imageFile) form.append('image', imageFile);

      await axios.post(`${baseUrl}/inventory/update/${editableItem.id}`, form, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Item updated successfully!');
      if (imageFile) {
        const imageUrl = URL.createObjectURL(imageFile);
        setImageSrcs((prev) => ({ ...prev, [editableItem.id]: imageUrl }));
      }

      refreshInventory();
      toggleEditModal();

    } catch (error) {
      console.error('Failed to update', error);
      toast.error(getApiErrorMessage(error, 'Failed to update item.'));
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    try {
      await axios.delete(`${baseUrl}/inventory/delete/${item.id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { folio_id: item.folio_id }
      });
      toast.success('Item deleted successfully!');
      refreshInventory();
    } catch (error) { toast.error('Failed to delete item.'); }
  };

  const getItemFilterOptionIds = (item) => {
    if (Array.isArray(item.filter_option_ids)) return item.filter_option_ids.map(Number);
    if (Array.isArray(item.custom_filter_option_ids)) return item.custom_filter_option_ids.map(Number);
    if (Array.isArray(item.custom_filters)) return item.custom_filters.map(filter => Number(filter.id));
    return [];
  };

  const summarizeItemTitles = (items) => {
    const names = items.map((item) => item.title).slice(0, 3).join(', ');
    return items.length > 3 ? `${names}, and ${items.length - 3} more` : names;
  };

  const openBulkFilterModal = () => {
    setBulkFilterOptionIds([]);
    setReplaceExistingFilters(false);
    setIsBulkFilterModalOpen(true);
  };

  const handleBulkFilterApply = async () => {
    if (selectedItemIds.length === 0) {
      toast.warning('Select at least one item first.');
      return;
    }

    if (bulkFilterOptionIds.length === 0) {
      toast.warning('Select at least one custom filter option.');
      return;
    }

    try {
      const selectedSet = new Set(selectedItemIds.map(Number));
      const itemsToUpdate = inventoryData.filter(item => selectedSet.has(Number(item.id)));

      const results = await Promise.all(itemsToUpdate.map(async (item) => {
        const currentFilterIds = getItemFilterOptionIds(item);
        const nextFilterIds = replaceExistingFilters
          ? bulkFilterOptionIds
          : Array.from(new Set([...currentFilterIds, ...bulkFilterOptionIds]));
        const form = new FormData();
        form.append('title', item.title);
        form.append('description', item.description || '');
        form.append('sort_order', item.sort_order);
        form.append('owner', item.owner);
        form.append('folio_id', item.folio_id);
        form.append('aleph_id', item.aleph_id || '');

        const itemBranches = Array.isArray(item.branches) ? item.branches : (item.branch ? [item.branch] : []);
        itemBranches.forEach(branch => form.append('branches[]', branch));
        nextFilterIds.forEach(id => form.append('filter_option_ids[]', id));

        try {
          await axios.post(`${baseUrl}/inventory/update/${item.id}`, form, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
          });
          return { status: 'fulfilled', item };
        } catch (error) {
          console.error('Failed to bulk update filters for item:', item.title, error);
          return { status: 'rejected', item };
        }
      }));

      const successes = results.filter(result => result.status === 'fulfilled');
      const failures = results.filter(result => result.status === 'rejected').map(result => result.item);

      if (successes.length > 0 && failures.length > 0) {
        refreshInventory();
      }

      if (failures.length > 0) {
        setSelectedItemIds(failures.map(item => item.id));
        if (successes.length > 0) {
          toast.warning(`Updated filters for ${successes.length} item${successes.length === 1 ? '' : 's'}; ${failures.length} failed: ${summarizeItemTitles(failures)}.`);
        } else {
          toast.error(`No selected item filters were updated. Failed: ${summarizeItemTitles(failures)}.`);
        }
        return;
      }

      toast.success(`Updated filters for ${successes.length} item${successes.length === 1 ? '' : 's'}.`);
      setIsBulkFilterModalOpen(false);
      setBulkFilterOptionIds([]);
      setSelectedItemIds([]);
      refreshInventory();
    } catch (error) {
      console.error('Failed to bulk update filters', error);
      toast.error('Failed to update selected item filters.');
    }
  };



  // --- Render Helpers ---

  const getBranchName = (code) => {
    const b = branches.find(br => br.code === code);
    if (!b) return code || 'Unassigned';
    // Remove 2-letter prefix followed by space (e.g. "SC ", "MH ")
    return b.name.replace(/^[A-Z]{2}\s+/, '');
  };

  const getBranchesDisplay = (item) => {
    const branchList = Array.isArray(item.branches) ? item.branches : (item.branch ? [item.branch] : []);
    if (branchList.length === 0) return 'Unassigned';
    return branchList.map(code => getBranchName(code)).join(', ');
  };

  // Filter Branches based on School Context
  const getFilteredBranches = () => {
    let prefix = '';
    if (mapLocations === 'SMC') prefix = 'SC';
    else if (mapLocations === 'MHC') prefix = 'MH';
    else if (mapLocations === 'AMH') prefix = 'AC';
    else if (mapLocations === 'HMC') prefix = 'HC';
    else if (mapLocations === 'UMA') prefix = 'UM';

    return branches.filter(b => b.code.startsWith(prefix));
  };

  const filteredBranches = getFilteredBranches();

  // Group items if mode enabled
  const renderContent = () => {
    let content = [];
    const dataToRender = hasUnsavedChanges || sortConfig.key !== 'default' ? localInventory : inventoryData;

    if (groupMode) {
      const grouped = {};
      dataToRender.forEach(item => {
        const branchList = Array.isArray(item.branches) ? item.branches : (item.branch ? [item.branch] : []);
        if (branchList.length === 0) {
          if (!grouped['Unassigned']) grouped['Unassigned'] = [];
          grouped['Unassigned'].push(item);
        } else {
          // Add item to each branch it belongs to
          branchList.forEach(b => {
            if (!grouped[b]) grouped[b] = [];
            grouped[b].push(item);
          });
        }
      });

      Object.keys(grouped).sort().forEach(groupKey => {
        content.push(
          <div key={groupKey} className="mb-4">
            <h5 className="mb-3 text-secondary border-bottom pb-2">
              {getBranchName(groupKey)} <small className="text-muted fw-normal">({grouped[groupKey].length})</small>
            </h5>
            {viewMode === 'grid' ? renderGrid(grouped[groupKey]) : renderList(grouped[groupKey])}
          </div>
        )
      });
    } else {
      content = viewMode === 'grid' ? renderGrid(dataToRender) : renderList(dataToRender);
    }
    return content;
  }

  const renderGrid = (items) => (
    <Row>
      {items.map((item) => (
        <Col key={item.id} md={4} lg={3} className="mb-4">
          <Card className="h-100 shadow-sm border-0" style={{ backgroundColor: styles.backgroundColor }}>
            <CardBody className="d-flex flex-column">
              <div className="mb-3 d-flex align-items-center justify-content-center bg-light rounded" style={{ height: '180px', overflow: 'hidden' }}>
                {imageSrcs[item.id] ? (
                  <img src={imageSrcs[item.id]} alt={item.title} style={{ maxHeight: '100%', maxWidth: '100%' }} />
                ) : (<span className="text-muted">No Image</span>)}
              </div>
              <CardTitle tag="h6" className="mb-2 fw-bold text-truncate" style={{ color: styles.titleColor }} title={item.title}>{item.title}</CardTitle>
              <div className="d-flex justify-content-between align-items-end flex-grow-1 mt-3">
                <div className="d-flex flex-column gap-1 overflow-hidden" style={{ maxWidth: '60%' }}>
                  <span className="badge bg-secondary align-self-start text-truncate" style={{ maxWidth: '100%' }}>{item.owner}</span>
                  {(Array.isArray(item.branches) ? item.branches : (item.branch ? [item.branch] : [])).map((branchCode, idx) => (
                    <span key={idx} className="badge bg-light text-dark border align-self-start text-truncate" style={{ maxWidth: '100%' }} title={getBranchName(branchCode)}>
                      {getBranchName(branchCode)}
                    </span>
                  ))}
                </div>
                <div className="d-flex flex-nowrap gap-1">
                  <Button size="sm" color="outline-primary" onClick={() => openEditModal(item)} aria-label={`Edit ${item.title}`} title="Edit item">
                    <Pencil size={16} aria-hidden="true" />
                  </Button>
                  <Button size="sm" color="outline-danger" onClick={() => handleDelete(item)} aria-label={`Delete ${item.title}`} title="Delete item">
                    <Trash2 size={16} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      ))}
    </Row>
  );

  // Sortable Row Component
  const SortableRow = ({ item, index }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: item.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      backgroundColor: selectedItemIds.includes(item.id) ? '#fff3cd' : 'white',
    };

    return (
      <tr ref={setNodeRef} style={style} {...attributes}>
        <td className="text-center">
          <Input type="checkbox" checked={selectedItemIds.includes(item.id)} onChange={() => toggleSelection(item.id)} aria-label={`Select ${item.title}`} />
        </td>
        <td>
          <div {...listeners} style={{ cursor: 'grab', display: 'inline-flex', alignItems: 'center', padding: '4px' }} role="button" aria-label={`Drag to reorder ${item.title}`} tabIndex="0">
            <i className="bi bi-grip-vertical text-secondary" style={{ fontSize: '1.2rem' }} aria-hidden="true"></i>
          </div>
        </td>
        <td>{imageSrcs[item.id] && <img src={imageSrcs[item.id]} className="rounded" style={{ width: '40px' }} alt="" />}</td>
        <td className="fw-medium text-start">{item.title}</td>
        <td className="text-start text-muted small text-truncate" style={{ maxWidth: '200px' }} aria-label={`Description: ${stripHtml(item.description)}`}>
          <div dangerouslySetInnerHTML={{ __html: item.description }} aria-hidden="true" />
        </td>
        <td>
          <span className="small text-muted">{index + 1}</span>
        </td>
        <td>{getBranchesDisplay(item)}</td>
        <td className="text-end">
          <div className="d-flex justify-content-end gap-1">
            <Button size="sm" color="outline-primary" onClick={() => openEditModal(item)} aria-label={`Edit ${item.title}`} title="Edit item">
              <Pencil size={16} aria-hidden="true" />
            </Button>
            <Button size="sm" color="outline-danger" onClick={() => handleDelete(item)} aria-label={`Delete ${item.title}`} title="Delete item">
              <Trash2 size={16} aria-hidden="true" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  SortableRow.propTypes = {
    item: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
    }).isRequired,
    index: PropTypes.number.isRequired,
  };

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localInventory.findIndex((inventoryItem) => inventoryItem.id === active.id);
      const newIndex = localInventory.findIndex((inventoryItem) => inventoryItem.id === over.id);

      const newOrder = arrayMove(localInventory, oldIndex, newIndex);
      setLocalInventory(newOrder);
      setHasUnsavedChanges(true);
    }
  };

  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const renderList = (items) => (
    <div className="bg-white rounded shadow-sm mb-3">
      <Table responsive hover className="mb-0 align-middle">
        <thead className="bg-light">
          <tr>
            <th scope="col" style={{ width: '40px' }} className="text-center" aria-label="Select items">
              <Input type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) setSelectedItemIds(items.map(i => i.id));
                  else setSelectedItemIds([]);
                }}
                checked={items.length > 0 && selectedItemIds.length === items.length}
                aria-label="Select all items"
              />
            </th>
            <th scope="col" style={{ width: '50px' }} aria-label="Drag to reorder">
              <i className="bi bi-arrows-move text-muted" aria-hidden="true"></i>
            </th>
            <th scope="col" style={{ width: '60px' }}>Image</th>
            <th scope="col" className="text-start" style={{ width: '20%' }}>Title</th>
            <th scope="col" className="text-start" style={{ width: '30%' }}>Description</th>
            <th scope="col" style={{ width: '60px' }}>#</th>
            <th scope="col" style={{ width: '20%' }}>Branch</th>
            <th scope="col" className="text-end" style={{ width: '120px' }}>Actions</th>
          </tr>
        </thead>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map(inventoryItem => inventoryItem.id)}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {items.map((inventoryItem, index) => (
                <SortableRow key={inventoryItem.id} item={inventoryItem} index={index} />
              ))}
            </tbody>
          </SortableContext>
        </DndContext>
      </Table>
    </div>
  );

  return (
    <div className="inventory-tab-container">
      {/* Batch Actions Bar (Sticky) */}
      {(hasUnsavedChanges || selectedItemIds.length > 0) && (
        <div className="sticky-top bg-warning-subtle p-3 rounded mb-4 shadow-sm border border-warning d-flex justify-content-between align-items-center animate__animated animate__fadeIn">
          <div className="d-flex align-items-center gap-3">
            <span className="fw-bold text-warning-emphasis">
              {hasUnsavedChanges ? 'Unsaved Order Changes' : 'Selection Active'}
            </span>
            {selectedItemIds.length > 0 && <span className="badge bg-dark">{selectedItemIds.length} Selected</span>}
          </div>
          <div className="d-flex gap-2">
            {selectedItemIds.length > 0 && (
              <Button color="light" size="sm" onClick={openMoveModal} aria-label="Move selected items"><i className="bi bi-arrow-down-up" aria-hidden="true"></i> Move</Button>
            )}
            {selectedItemIds.length > 0 && filterGroups.length > 0 && (
              <Button color="light" size="sm" onClick={openBulkFilterModal} aria-label="Add filters to selected items">
                <Filter size={15} className="me-1" aria-hidden="true" /> Filters
              </Button>
            )}
            {hasUnsavedChanges && (
              <Button color="success" size="sm" onClick={handleSaveOrder} aria-label="Save order changes"><i className="bi bi-check-lg" aria-hidden="true"></i> Save Order</Button>
            )}
            <Button color="secondary" size="sm" onClick={() => { setHasUnsavedChanges(false); setLocalInventory([...inventoryData].sort((a, b) => a.sort_order - b.sort_order)); setSelectedItemIds([]); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <h2 className="h4 m-0 text-dark">Current Inventory</h2>
        <div className="d-flex gap-2 align-items-center">
          {/* Sort Controls */}
          <ButtonGroup className="me-3">
            <Button outline size="sm" color="secondary" active={sortConfig.key === 'default'} onClick={() => handleSortBy('default')}>
              Default
            </Button>
            <Button outline size="sm" color="secondary" active={sortConfig.key === 'title'} onClick={() => handleSortBy('title')}>
              Title {sortConfig.key === 'title' && <i className={`bi bi-sort-alpha-${sortConfig.direction === 'asc' ? 'down' : 'up'}`}></i>}
            </Button>
            <Button outline size="sm" color="secondary" active={sortConfig.key === 'branch'} onClick={() => handleSortBy('branch')}>
              Branch {sortConfig.key === 'branch' && <i className={`bi bi-sort-alpha-${sortConfig.direction === 'asc' ? 'down' : 'up'}`}></i>}
            </Button>
            <div className="btn-group" role="group">
              <Button outline size="sm" color="secondary" active={sortConfig.key === 'branch_priority'} onClick={() => handleSortBy('branch_priority')} title="Sort by Custom Branch order">
                Branch Order {sortConfig.key === 'branch_priority' && <i className={`bi bi-sort-numeric-${sortConfig.direction === 'asc' ? 'down' : 'up'}`}></i>}
              </Button>
              <Button outline size="sm" color="secondary" onClick={() => setIsBranchOrderModalOpen(true)} title="Configure Branch Order">
                <i className="bi bi-gear-fill"></i>
              </Button>
            </div>
          </ButtonGroup>

          {/* Group Toggle */}
          <div className="form-check form-switch me-3">
            <Input className="form-check-input" type="checkbox" id="groupSwitch" checked={groupMode} onChange={() => setGroupMode(!groupMode)} />
            <Label className="form-check-label" for="groupSwitch">Group by Library</Label>
          </div>
          <ButtonGroup>
            <Button 
              color="light" 
              active={viewMode === 'grid'} 
              onClick={() => setViewMode('grid')}
              title="Grid view - visual overview (no reordering)"
            >
              <i className="bi bi-grid-3x3-gap-fill"></i> Grid
            </Button>
            <Button 
              color="light" 
              active={viewMode === 'list'} 
              onClick={() => setViewMode('list')}
              title="List view - allows drag handles and reordering"
            >
              <i className="bi bi-list-ul"></i> List
            </Button>
          </ButtonGroup>
          <Button color="primary" onClick={toggleSearchModal} className="d-inline-flex align-items-center gap-2 text-white">
            <Plus size={16} aria-hidden="true" /> Add Equipment
          </Button>
        </div>
      </div>

      {renderContent()}

      {/* Branch Order Config Modal */}
      <Modal isOpen={isBranchOrderModalOpen} toggle={() => setIsBranchOrderModalOpen(!isBranchOrderModalOpen)}>
        <ModalHeader>Configure Branch Order</ModalHeader>
        <ModalBody>
          <p className="small text-muted mb-3">Drag items would be ideal, but for now use arrows to set the order of importance.</p>
          <Table size="sm" hover>
            <tbody>
              {customBranchOrder.map((branch, index) => (
                <tr key={branch.code}>
                  <td style={{ width: '40px' }} className="text-secondary fw-bold">{index + 1}</td>
                  <td>{branch.name}</td>
                  <td className="text-end">
                    <Button size="sm" color="link" className="p-0 text-decoration-none me-2" onClick={() => moveBranchConfig(index, 'up')} disabled={index === 0}>
                      <i className="bi bi-arrow-up-circle-fill fs-5 text-secondary"></i>
                    </Button>
                    <Button size="sm" color="link" className="p-0 text-decoration-none" onClick={() => moveBranchConfig(index, 'down')} disabled={index === customBranchOrder.length - 1}>
                      <i className="bi bi-arrow-down-circle-fill fs-5 text-secondary"></i>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={applyBranchOrder}>Apply & Close</Button>
        </ModalFooter>
      </Modal>

      {/* Move Modal */}
      <Modal isOpen={isMoveModalOpen} toggle={() => setIsMoveModalOpen(!isMoveModalOpen)}>
        <ModalHeader>Move {selectedItemIds.length} Items</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Position</Label>
            <div className="d-flex gap-3 mb-3">
              <FormGroup check>
                <Label check>
                  <Input type="radio" name="pos" checked={movePosition === 'before'} onChange={() => setMovePosition('before')} /> Before
                </Label>
              </FormGroup>
              <FormGroup check>
                <Label check>
                  <Input type="radio" name="pos" checked={movePosition === 'after'} onChange={() => setMovePosition('after')} /> After
                </Label>
              </FormGroup>
            </div>
          </FormGroup>
          <FormGroup>
            <Label>Target Item</Label>
            <Input type="select" value={moveTargetId} onChange={(e) => setMoveTargetId(e.target.value)}>
              <option value="">Select Item...</option>
              {localInventory.filter(i => !selectedItemIds.includes(i.id)).map(i => (
                <option key={i.id} value={i.id}>{i.title}</option>
              ))}
            </Input>
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setIsMoveModalOpen(false)}>Cancel</Button>
          <Button color="primary" onClick={handleBatchMove} disabled={!moveTargetId}>Move Items</Button>
        </ModalFooter>
      </Modal>

      {/* Bulk Filter Modal */}
      <Modal isOpen={isBulkFilterModalOpen} toggle={() => setIsBulkFilterModalOpen(!isBulkFilterModalOpen)} size="lg">
        <ModalHeader toggle={() => setIsBulkFilterModalOpen(!isBulkFilterModalOpen)}>
          Add Filters to {selectedItemIds.length} Selected Item{selectedItemIds.length === 1 ? '' : 's'}
        </ModalHeader>
        <ModalBody>
          <p className="text-muted small mb-3">
            Selected filter options will be added to each selected item. Existing filters are preserved unless replace is enabled.
          </p>
          <div className="row g-3">
            {filterGroups.map((group) => (
              <Col md={6} key={group.id}>
                <MultiSelectFilter
                  label={group.name}
                  options={group.options}
                  idField="id"
                  selectedValues={bulkFilterOptionIds.filter(id => (
                    group.options.some(option => Number(option.id) === Number(id))
                  ))}
                  onChange={(selectedIds) => handleBulkFilterGroupChange(group, selectedIds)}
                  placeholder={`Select ${group.name}`}
                />
              </Col>
            ))}
          </div>
          <FormGroup check className="mt-4">
            <Input
              id="replace-existing-filters"
              type="checkbox"
              checked={replaceExistingFilters}
              onChange={(event) => setReplaceExistingFilters(event.target.checked)}
            />
            <Label check for="replace-existing-filters">
              Replace existing custom filters on selected items
            </Label>
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setIsBulkFilterModalOpen(false)}>Cancel</Button>
          <Button color="primary" onClick={handleBulkFilterApply} disabled={bulkFilterOptionIds.length === 0}>
            Apply Filters
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} toggle={toggleEditModal} size="lg">
        <ModalHeader toggle={toggleEditModal}>Edit Item</ModalHeader>
        <ModalBody>
          {editableItem && (
            <Row>
              <Col md={4} className="text-center mb-3 mb-md-0">
                <div className="border rounded p-2 bg-light d-flex align-items-center justify-content-center" style={{ height: '200px' }}>
                  {imageFile ? (
                    <span className="text-success fw-bold">New Image Selected</span>
                  ) : imageSrcs[editableItem.id] ? (
                    <img src={imageSrcs[editableItem.id]} alt="Current" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                  ) : (<span className="text-muted">No Current Image</span>)}
                </div>
                <div className="mt-2">
                  <Label className="btn btn-sm btn-outline-secondary w-100" style={{ cursor: 'pointer' }}>
                    Upload New Image
                    <Input
                      innerRef={editImageInputRef}
                      type="file"
                      hidden
                      onChange={handleImageChange}
                      accept="image/*"
                    />
                  </Label>
                  <small className="text-muted d-block mt-1">Maximum file size: 2 MB</small>
                </div>
              </Col>
              <Col md={8}>
                <FormGroup>
                  <Label>Title</Label>
                  <Input name="title" value={formData.title || ''} onChange={handleInputChange} />
                </FormGroup>
                <FormGroup>
                  <Label for="itemDescription">Description</Label>
                  <div id="item-description-editor">
                    <ReactQuill
                      theme="snow"
                      value={formData.description || ''}
                      onChange={handleDescriptionChange}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder="Enter item description with formatting and links..."
                      style={{ backgroundColor: 'white', borderRadius: '4px' }}
                      aria-labelledby="itemDescription"
                    />
                  </div>
                  <small className="text-muted d-block mt-1">
                    <i className="bi bi-info-circle me-1"></i>
                    Use the toolbar to format text and add hyperlinks
                  </small>
                </FormGroup>
                <Row>
                  <Col md={12}>
                    <FormGroup>
                      <Label>Owner</Label>
                      <Input type="select" name="owner" value={formData.owner || 'SMC'} onChange={handleInputChange}>
                        <option value="MHC">Mount Holyoke</option>
                        <option value="SMC">Smith College</option>
                        <option value="AMH">Amherst College</option>
                        <option value="HMC">Hampshire College</option>
                        <option value="UMA">UMass Amherst</option>
                      </Input>
                    </FormGroup>
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      To reorder items, use the up/down arrows in list view
                    </small>
                  </Col>
                  <Col md={12}>
                    <FormGroup>
                      <Label>Branch Locations</Label>
                      {/* Display selected branches */}
                      {formData.branches && formData.branches.length > 0 && (
                        <div className="mb-2 d-flex flex-wrap gap-1">
                          {formData.branches.map((branchCode) => (
                            <span key={branchCode} className="badge bg-primary d-inline-flex align-items-center gap-1 py-2 px-3">
                              {getBranchName(branchCode)}
                              <i
                                className="bi bi-x-circle"
                                style={{ cursor: 'pointer', fontSize: '1rem' }}
                                onClick={() => handleRemoveBranch(branchCode)}
                                title="Remove branch"
                              ></i>
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Add branch selector */}
                      <SearchableSelect
                        options={filteredBranches.filter(b => !formData.branches.includes(b.code))}
                        value=""
                        onChange={handleBranchChange}
                        placeholder="Add a branch..."
                        idField="code"
                      />
                      <small className="text-muted">Select multiple branch locations for this item</small>
                    </FormGroup>
                  </Col>
                  {filterGroups.length > 0 && (
                    <Col md={12}>
                      <div className="border-top pt-3 mt-2">
                        <Label className="fw-bold">Custom Filters</Label>
                        <div className="row g-3">
                          {filterGroups.map((group) => (
                            <Col md={6} key={group.id}>
                              <MultiSelectFilter
                                label={group.name}
                                options={group.options}
                                idField="id"
                                selectedValues={(formData.filterOptionIds || []).filter(id => (
                                  group.options.some(option => Number(option.id) === Number(id))
                                ))}
                                onChange={(selectedIds) => handleFilterGroupChange(group, selectedIds)}
                                placeholder={`Select ${group.name}`}
                              />
                            </Col>
                          ))}
                        </div>
                        <small className="text-muted d-block mt-2">Select all filter options that should apply to this item.</small>
                      </div>
                    </Col>
                  )}
                </Row>
              </Col>
            </Row>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleEditModal}>Cancel</Button>
          <Button color="success" onClick={handleUpdate}>Save Changes</Button>
        </ModalFooter>
      </Modal>

      {/* Add Modal */}
      <AddItemModal
        isOpen={isSearchModalOpen}
        toggle={toggleSearchModal}
        baseUrl={baseUrl}
        token={token}
        mapLocations={mapLocations}
        refreshInventory={refreshInventory}
        filteredBranches={filteredBranches}
        filterGroups={filterGroups}
      />
    </div>
  );
}

InventoryTab.propTypes = {
  inventoryData: PropTypes.array.isRequired,
  styles: PropTypes.object.isRequired,
  baseUrl: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
  refreshInventory: PropTypes.func.isRequired,
  mapLocations: PropTypes.string,
  filterGroups: PropTypes.array,
};

// Note: SortableRow is defined inside InventoryTab to access closures

export default InventoryTab;
