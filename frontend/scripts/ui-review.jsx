// Development-only component fixture, not registered in the product router.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import Input from '../src/components/ui/Input';
import Select from '../src/components/ui/Select';
import Button from '../src/components/ui/Button';
import DataTable from '../src/components/ui/DataTable';
import Modal from '../src/components/ui/Modal';
import Drawer from '../src/components/ui/Drawer';
import FilterDrawer from '../src/components/common/FilterDrawer';

const rows = [{ id: 'INV-1001', customer: 'Example customer', amount: '1,250.00', status: 'Pending' }, { id: 'INV-1002', customer: 'Second customer', amount: '950.00', status: 'Paid' }];

export default function Fixture() {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState('');
  const [nested, setNested] = useState(false);
  const [filters, setFilters] = useState(false);
  return <main className="portal-page-inner space-y-6">
    <h1>Shared UI interaction review</h1>
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Email" name="email" error="Enter a valid email address." defaultValue="invalid" />
      <Input label="Backup email" name="email" helperText="Optional contact address." />
      <Select label="Department" error="Choose a department." options={[{ value: '', label: 'Select department' }, { value: 'finance', label: 'Finance' }]} />
    </div>
    <div className="flex flex-wrap gap-3"><Button id="open-review-dialog" onClick={() => setOpen(true)}>Create invoice</Button><Button id="open-review-filters" onClick={() => setFilters(true)}>Filters</Button><Button variant="secondary" onClick={() => document.documentElement.classList.toggle('dark')}>Toggle theme</Button></div>
    <DataTable ariaLabel="Review invoices" columns={Object.keys(rows[0]).map(key => ({ key, header: key }))} rows={rows} selectable onRowClick={row => setOpened(row.id)} />
    <p id="row-result" role="status">{opened ? `Opened invoice ${opened}` : 'No invoice opened'}</p>
    <Modal open={open} onClose={() => setOpen(false)} title="Create invoice" description="Review keyboard focus, scrolling and field validation." footer={<Button onClick={() => setOpen(false)}>Cancel</Button>}>
      <Input label="Invoice reference" name="reference" />
      <Input label="Notes" name="notes" helperText="Keep the reference meaningful." />
      <Button id="open-nested-dialog" onClick={() => setNested(true)}>Review allocation</Button>
    </Modal>
    <Drawer open={open && nested} title="Allocation details" onClose={() => setNested(false)}><p>Nested dialog focus review.</p></Drawer>
    <FilterDrawer open={filters} onClose={() => setFilters(false)}><Select label="Status" options={[{ value: 'all', label: 'All invoices' }, { value: 'pending', label: 'Pending' }]} /></FilterDrawer>
  </main>;
}

createRoot(document.getElementById('root')).render(<Fixture />);
