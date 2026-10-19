import React, { useMemo, useState } from 'react';
import { Plus, Pencil, X, MapPin } from 'lucide-react';
import {
  PageHeader,
  StatusBadge,
  Modal,
  EmptyState,
  FilterBar,
  btnPrimaryClass,
  btnSecondaryClass,
} from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import { INITIAL_CITIES, INITIAL_BRANDS } from '../data/mockData';

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FF9418]';
const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400';

const emptyForm = {
  name: '',
  state: 'Madhya Pradesh',
  status: 'Active',
  brandIds: [],
  zones: [],
  deliveryAvailable: true,
  sameDayDelivery: false,
  codAvailable: true,
};

const getZones = (city) => city.zones || city.serviceAreas || [];

const Cities = () => {
  const ctx = useMyWillBookSuperAdmin();
  const [localCities, setLocalCities] = useState(INITIAL_CITIES);
  const brands = ctx?.brands ?? INITIAL_BRANDS;
  const cities = ctx?.cities ?? localCities;

  const createCity =
    ctx?.createCity ||
    ((payload) => {
      const zones = payload.zones || [];
      const next = {
        id: `city_${Date.now()}`,
        ...emptyForm,
        ...payload,
        zones,
        serviceAreas: zones,
        brandsCount: (payload.brandIds || []).length,
      };
      setLocalCities((prev) => [next, ...prev]);
      return next;
    });

  const updateCity =
    ctx?.updateCity ||
    ((id, patch) => {
      setLocalCities((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const zones = patch.zones ?? getZones(c);
          return {
            ...c,
            ...patch,
            zones,
            serviceAreas: zones,
            brandsCount: (patch.brandIds || c.brandIds || []).length,
          };
        })
      );
    });

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [zoneInput, setZoneInput] = useState('');

  const brandLabel = (id) => brands.find((b) => b.id === id)?.name || id;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return cities.filter((c) => {
      const brandNames = (c.brandIds || []).map(brandLabel).join(' ').toLowerCase();
      const zones = getZones(c).join(' ').toLowerCase();
      const matchesQ =
        !term ||
        c.name.toLowerCase().includes(term) ||
        (c.state || '').toLowerCase().includes(term) ||
        brandNames.includes(term) ||
        zones.includes(term);
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [cities, q, statusFilter, brands]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setZoneInput('');
    setModalOpen(true);
  };

  const openEdit = (city) => {
    setEditing(city);
    setForm({
      name: city.name || '',
      state: city.state || 'Madhya Pradesh',
      status: city.status || 'Active',
      brandIds: [...(city.brandIds || [])],
      zones: [...getZones(city)],
      deliveryAvailable: city.deliveryAvailable !== false,
      sameDayDelivery: !!city.sameDayDelivery,
      codAvailable: city.codAvailable !== false,
    });
    setZoneInput('');
    setModalOpen(true);
  };

  const addZone = () => {
    const z = zoneInput.trim();
    if (!z || form.zones.includes(z)) {
      setZoneInput('');
      return;
    }
    setForm((f) => ({ ...f, zones: [...f.zones, z] }));
    setZoneInput('');
  };

  const removeZone = (z) => setForm((f) => ({ ...f, zones: f.zones.filter((x) => x !== z) }));

  const toggleBrand = (brandId) => {
    setForm((f) => ({
      ...f,
      brandIds: f.brandIds.includes(brandId)
        ? f.brandIds.filter((id) => id !== brandId)
        : [...f.brandIds, brandId],
    }));
  };

  const saveForm = () => {
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      serviceAreas: form.zones,
      brandsCount: form.brandIds.length,
    };
    if (editing) updateCity(editing.id, payload);
    else createCity(payload);
    setModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cities & Service Areas"
        subtitle="Manage cities, zones, delivery availability, and associated brands"
        breadcrumbs={['MyWillBook', 'Business', 'Cities']}
        actions={
          <button type="button" onClick={openAdd} className={btnPrimaryClass}>
            <Plus size={14} /> Add City
          </button>
        }
      />

      <FilterBar>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search city, zone, brand…"
          className={`${fieldClass} sm:min-w-[240px] sm:flex-1`}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={fieldClass}
        >
          <option value="all">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState title="No cities match your search." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((city) => (
            <article key={city.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div className="rounded-xl bg-orange-50 p-2 text-[#FF9418]">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{city.name}</h3>
                    <p className="text-[11px] font-semibold text-slate-500">{city.state}</p>
                    <div className="mt-1">
                      <StatusBadge status={city.status} />
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => openEdit(city)} className={btnSecondaryClass}>
                  <Pencil size={12} /> Edit
                </button>
              </div>

              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Associated brands</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(city.brandIds || []).length === 0 ? (
                    <span className="text-[11px] font-semibold text-slate-400">
                      {city.brandsCount ? `${city.brandsCount} brand(s)` : 'None'}
                    </span>
                  ) : (
                    city.brandIds.map((id) => (
                      <span
                        key={id}
                        className="rounded-full bg-[#31551C]/10 px-2 py-0.5 text-[10px] font-bold text-[#31551C]"
                      >
                        {brandLabel(id)}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Service zones</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {getZones(city).map((z) => (
                    <span
                      key={z}
                      className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-[#FF9418]"
                    >
                      {z}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-bold text-slate-600">
                <span className={city.deliveryAvailable !== false ? 'text-[#31551C]' : 'text-slate-400'}>
                  Delivery {city.deliveryAvailable !== false ? 'On' : 'Off'}
                </span>
                <span className={city.sameDayDelivery ? 'text-[#31551C]' : 'text-slate-400'}>
                  Same-day {city.sameDayDelivery ? 'On' : 'Off'}
                </span>
                <span className={city.codAvailable !== false ? 'text-[#31551C]' : 'text-slate-400'}>
                  COD {city.codAvailable !== false ? 'On' : 'Off'}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit City' : 'Add City'}
        wide
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className={btnSecondaryClass}>
              Cancel
            </button>
            <button
              type="button"
              onClick={saveForm}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border-none bg-[#31551C] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#264214]"
            >
              {editing ? 'Save city' : 'Create city'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>City name</label>
              <input
                className={fieldClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input
                className={fieldClass}
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={fieldClass}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <p className={labelClass}>Associated brands</p>
            <div className="flex flex-wrap gap-2">
              {brands.map((b) => {
                const on = form.brandIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBrand(b.id)}
                    className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                      on
                        ? 'border-[#31551C] bg-[#31551C] text-white'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className={labelClass}>Service area zones</p>
            <div className="flex gap-2">
              <input
                className={fieldClass}
                value={zoneInput}
                onChange={(e) => setZoneInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addZone();
                  }
                }}
                placeholder="Add zone and press Enter"
              />
              <button type="button" onClick={addZone} className={btnSecondaryClass}>
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.zones.map((z) => (
                <span
                  key={z}
                  className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-[#FF9418]"
                >
                  {z}
                  <button
                    type="button"
                    onClick={() => removeZone(z)}
                    className="inline-flex cursor-pointer border-none bg-transparent p-0 text-[#FF9418]"
                    aria-label={`Remove ${z}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className={labelClass}>Delivery availability</p>
            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
              {[
                ['deliveryAvailable', 'Delivery available'],
                ['sameDayDelivery', 'Same-day delivery'],
                ['codAvailable', 'COD available'],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between gap-3 text-xs font-bold text-slate-700"
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={!!form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                    className="h-4 w-4 accent-[#FF9418]"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Cities;
