import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, FileText, Plus, UserPlus, X } from 'lucide-react';
import employeePortalService from '../../../services/employeePortalService';
import { Field, Notice, btnPrimary, inputCls, todayIST } from '../components/ui';

const EMPTY = {
  fullName: '', email: '', mobile: '', gender: '', dateOfBirth: '', address: '', city: '', brandId: '',
  department: '', designation: '', joiningDate: todayIST(), assignedAdminId: '', password: '', confirm: '', idProofType: 'Aadhaar Card',
  emergencyName: '', emergencyRelationship: '', emergencyPhone: '',
};
const ID_TYPES = ['Aadhaar Card', 'PAN Card', 'Driving Licence', 'Voter ID', 'Passport'];
const DOC_LABELS = ['Address proof', 'Educational certificate', 'Experience letter', 'Bank passbook / cancelled cheque', 'Passport-size photograph', 'Other'];
const RELATIONS = ['Father', 'Mother', 'Spouse', 'Brother', 'Sister', 'Son / Daughter', 'Friend', 'Other relative'];
const MAX_EXTRA_DOCS = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const kb = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
let docSeq = 0;

export default function EmployeeRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [busy, setBusy] = useState(false);
  const [brands, setBrands] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [photo, setPhoto] = useState({ url: '', preview: '', uploading: false, error: '' });
  const [idDoc, setIdDoc] = useState({ url: '', name: '', uploading: false, error: '' });
  // Optional extra documents: several files, each with an optional "what is this" label
  const [extraDocs, setExtraDocs] = useState([]); // { key, name, size, label, url, uploading, error }
  const [docNote, setDocNote] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    employeePortalService.brands().then(setBrands).catch((e) => setLoadError(e.message));
  }, []);

  // Departments and admins depend on the selected brand
  useEffect(() => {
    setDepartments([]);
    setAdmins([]);
    if (!form.brandId) return;
    employeePortalService.departments(form.brandId).then(setDepartments).catch(() => {});
    employeePortalService.admins(form.brandId).then(setAdmins).catch(() => {});
  }, [form.brandId]);

  const designations = useMemo(() => departments.find((d) => d.name === form.department)?.designations || [], [departments, form.department]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value, ...(k === 'brandId' ? { department: '', designation: '', assignedAdminId: '' } : {}), ...(k === 'department' ? { designation: '' } : {}) }));

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) return setPhoto((p) => ({ ...p, error: 'Choose an image file.' }));
    if (file.size > 5 * 1024 * 1024) return setPhoto((p) => ({ ...p, error: 'Image must be under 5 MB.' }));
    setPhoto({ url: '', preview: URL.createObjectURL(file), uploading: true, error: '' });
    try {
      const url = await employeePortalService.uploadProfilePhoto(file);
      setPhoto((p) => ({ ...p, url, uploading: false }));
    } catch (err) {
      setPhoto((p) => ({ ...p, uploading: false, error: err.message }));
    }
  };

  const onIdDoc = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^(image\/|application\/pdf)/.test(file.type)) return setIdDoc({ url: '', name: '', uploading: false, error: 'Upload an image (JPG, PNG) or a PDF.' });
    if (file.size > 5 * 1024 * 1024) return setIdDoc({ url: '', name: '', uploading: false, error: 'File must be under 5 MB.' });
    setIdDoc({ url: '', name: file.name, uploading: true, error: '' });
    try {
      const url = await employeePortalService.uploadIdProof(file);
      setIdDoc({ url, name: file.name, uploading: false, error: '' });
    } catch (err) {
      setIdDoc({ url: '', name: '', uploading: false, error: err.message });
    }
  };

  const onExtraDocs = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setDocNote('');
    if (!files.length) return;
    const room = MAX_EXTRA_DOCS - extraDocs.length;
    const notes = [];
    if (files.length > room) notes.push(`Only ${room} more document${room === 1 ? '' : 's'} can be added (the limit is ${MAX_EXTRA_DOCS}); the rest were left out.`);
    const batch = [];
    for (const file of files.slice(0, Math.max(0, room))) {
      if (!/^(image\/|application\/pdf)/.test(file.type)) { notes.push(`"${file.name}" is not a photo or PDF, so it was skipped.`); continue; }
      if (file.size > MAX_BYTES) { notes.push(`"${file.name}" is over 5 MB, so it was skipped.`); continue; }
      batch.push({ key: ++docSeq, file, entry: { key: docSeq, name: file.name, size: file.size, label: 'Other', url: '', uploading: true, error: '' } });
    }
    if (notes.length) setDocNote(notes.join(' '));
    if (!batch.length) return;
    setExtraDocs((cur) => [...cur, ...batch.map((b) => b.entry)]);
    // upload all chosen files at the same time
    await Promise.all(batch.map(async ({ key, file }) => {
      try {
        const url = await employeePortalService.uploadIdProof(file);
        if (!url) throw new Error('Upload failed');
        setExtraDocs((cur) => cur.map((d) => (d.key === key ? { ...d, url, uploading: false } : d)));
      } catch (err) {
        setExtraDocs((cur) => cur.map((d) => (d.key === key ? { ...d, uploading: false, error: err.message || 'Upload failed' } : d)));
      }
    }));
  };
  const patchDoc = (key, patch) => setExtraDocs((cur) => cur.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const removeDoc = (key) => { setExtraDocs((cur) => cur.filter((d) => d.key !== key)); setDocNote(''); setErrors((x) => ({ ...x, extraDocs: '' })); };

  const validate = () => {
    const e = {};
    if (form.fullName.trim().length < 2) e.fullName = 'Enter your full name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!/^\d{10}$/.test(form.mobile)) e.mobile = 'Enter a 10-digit mobile number';
    if (!form.gender) e.gender = 'Select gender';
    if (!form.dateOfBirth) e.dateOfBirth = 'Select your date of birth';
    if (!form.address.trim()) e.address = 'Enter your address';
    if (!form.city.trim()) e.city = 'Enter your city';
    if (!form.brandId) e.brandId = 'Select a brand';
    if (!form.department.trim()) e.department = 'Select a department';
    if (!form.designation.trim()) e.designation = 'Select a designation';
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.password)) e.password = 'At least 8 characters with a letter and a number';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    if (!idDoc.url) e.idDoc = 'Upload a copy of your ID proof';
    if (extraDocs.some((d) => d.error)) e.extraDocs = 'Remove the documents that failed to upload (or upload them again).';
    // Emergency contact is optional; once any detail is given the name and number are needed
    const emFilled = form.emergencyName.trim() || form.emergencyRelationship || form.emergencyPhone;
    if (emFilled) {
      if (form.emergencyName.trim().length < 2) e.emergencyName = "Enter the contact's name";
      if (!/^\d{10}$/.test(form.emergencyPhone)) e.emergencyPhone = 'Enter a 10-digit mobile number';
      else if (form.emergencyPhone === form.mobile) e.emergencyPhone = 'Use a different number from your own';
    }
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setApiError('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    if (photo.uploading || idDoc.uploading || extraDocs.some((d) => d.uploading)) return setApiError('Please wait for the uploads to finish.');
    setBusy(true);
    try {
      const { confirm, emergencyName, emergencyRelationship, emergencyPhone, ...body } = form;
      const hasEmergency = emergencyName.trim() || emergencyRelationship || emergencyPhone;
      await employeePortalService.register({
        ...body,
        profilePhoto: photo.url,
        idProofUrl: idDoc.url,
        assignedAdminId: form.assignedAdminId || undefined,
        additionalDocuments: extraDocs.map((d) => ({ label: d.label, name: d.name, url: d.url })),
        emergencyContact: hasEmergency ? { name: emergencyName.trim(), relationship: emergencyRelationship, phone: emergencyPhone } : undefined,
      });
      navigate('/employee/login', { replace: true, state: { registered: true } });
    } catch (err) {
      setApiError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-lg p-6 sm:p-9">
        <div className="text-center mb-7">
          <img src="/LogoSavitri.png" alt="Savitri" className="h-12 mx-auto mb-3 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <h1 className="text-2xl font-extrabold text-slate-900 m-0">Employee Registration</h1>
          <p className="text-sm text-slate-500 mt-1.5 mb-0">Your Employee ID is generated automatically. An administrator approves your account before you can log in.</p>
        </div>

        {loadError && <div className="mb-4"><Notice type="error">{loadError}</Notice></div>}
        {apiError && <div className="mb-4"><Notice type="error">{apiError}</Notice></div>}

        <form onSubmit={submit} noValidate className="space-y-6">
          <div className="flex items-center gap-4">
            <label className="relative w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-emerald-500">
              {photo.preview ? <img src={photo.preview} alt="" className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-slate-400" />}
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </label>
            <div className="text-sm">
              <p className="font-semibold text-slate-800 m-0">Profile photo</p>
              <p className="text-xs text-slate-500 m-0">{photo.uploading ? 'Uploading…' : photo.url ? 'Uploaded' : 'Optional · JPG or PNG, up to 5 MB'}</p>
              {photo.error && <p className="text-xs text-rose-600 m-0">{photo.error}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name *" error={errors.fullName}><input className={inputCls} value={form.fullName} onChange={set('fullName')} autoComplete="name" /></Field>
            <Field label="Email address *" error={errors.email}><input className={inputCls} type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
            <Field label="Mobile number *" error={errors.mobile}><input className={inputCls} inputMode="numeric" maxLength={10} value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '') }))} autoComplete="tel" /></Field>
            <Field label="Gender *" error={errors.gender}>
              <select className={inputCls} value={form.gender} onChange={set('gender')}>
                <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
              </select>
            </Field>
            <Field label="Date of birth *" error={errors.dateOfBirth}><input className={inputCls} type="date" max={todayIST()} value={form.dateOfBirth} onChange={set('dateOfBirth')} /></Field>
            <Field label="City *" error={errors.city}><input className={inputCls} value={form.city} onChange={set('city')} autoComplete="address-level2" /></Field>
            <div className="sm:col-span-2"><Field label="Address *" error={errors.address}><textarea className={inputCls} rows={2} value={form.address} onChange={set('address')} autoComplete="street-address" /></Field></div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-5 border-t border-slate-100">
            <Field label="Assigned brand *" error={errors.brandId}>
              <select className={inputCls} value={form.brandId} onChange={set('brandId')}>
                <option value="">Select brand</option>
                {brands.map((b) => <option key={b.brandId} value={b.brandId}>{b.name} — {b.city}</option>)}
              </select>
            </Field>
            <Field label="Assigned admin (optional)" hint={!form.brandId ? 'Select a brand first' : admins.length ? '' : 'No admin to choose for this brand'}>
              <select className={inputCls} value={form.assignedAdminId} onChange={set('assignedAdminId')} disabled={!admins.length}>
                <option value="">Not specified</option>
                {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Department *" error={errors.department} hint={form.brandId && !departments.length ? 'No departments are set up for this brand yet — type yours' : ''}>
              {departments.length ? (
                <select className={inputCls} value={form.department} onChange={set('department')}>
                  <option value="">Select department</option>
                  {departments.map((d) => <option key={d._id} value={d.name}>{d.name}</option>)}
                </select>
              ) : (
                <input className={inputCls} value={form.department} onChange={set('department')} disabled={!form.brandId} />
              )}
            </Field>
            <Field label="Designation *" error={errors.designation}>
              {designations.length ? (
                <select className={inputCls} value={form.designation} onChange={set('designation')}>
                  <option value="">Select designation</option>
                  {designations.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <input className={inputCls} value={form.designation} onChange={set('designation')} disabled={!form.department} />
              )}
            </Field>
            <Field label="Joining date"><input className={inputCls} type="date" value={form.joiningDate} onChange={set('joiningDate')} /></Field>
            <Field label="Employee ID" hint="Generated automatically after you register"><input className={inputCls} value="Auto-generated" disabled /></Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-5 border-t border-slate-100">
            <Field label="ID proof type *">
              <select className={inputCls} value={form.idProofType} onChange={set('idProofType')}>
                {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="ID proof document *" error={errors.idDoc || idDoc.error} hint="Photo or PDF of your ID, up to 5 MB">
              <label className={`${inputCls} flex items-center gap-2.5 cursor-pointer hover:border-emerald-500`}>
                <FileText className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                <span className={`truncate ${idDoc.name ? 'text-slate-900' : 'text-slate-400'}`}>{idDoc.uploading ? 'Uploading…' : idDoc.name ? `${idDoc.name}${idDoc.url ? ' ✓' : ''}` : 'Choose a file'}</span>
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onIdDoc} />
              </label>
            </Field>
          </div>

          <div className="pt-5 border-t border-slate-100 space-y-3" data-testid="reg-docs-section">
            <div>
              <h3 className="m-0 text-[15px] font-bold text-slate-900">Additional documents <span className="font-normal text-slate-400">(optional)</span></h3>
              <p className="m-0 mt-1 text-xs text-slate-500">Address proof, certificates, experience letters… You can add up to {MAX_EXTRA_DOCS} files (photo or PDF, 5 MB each), or skip this.</p>
            </div>
            {extraDocs.map((d) => (
              <div key={d.key} data-testid="reg-doc" className={`flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3 ${d.error ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-slate-50/60'}`}>
                <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-semibold text-slate-900 truncate">{d.name}</p>
                  <p className={`m-0 text-xs ${d.error ? 'text-rose-600' : d.url ? 'text-emerald-700' : 'text-slate-500'}`}>{d.uploading ? 'Uploading…' : d.error ? d.error : d.url ? `Uploaded ✓ · ${kb(d.size)}` : kb(d.size)}</p>
                </div>
                <select data-testid="reg-doc-label" aria-label={`What is ${d.name}?`} className={`${inputCls} !w-auto !py-2 text-sm`} value={d.label} onChange={(e) => patchDoc(d.key, { label: e.target.value })} disabled={d.uploading}>
                  {DOC_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <button type="button" data-testid="reg-doc-remove" onClick={() => removeDoc(d.key)} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-transparent border-0 cursor-pointer" aria-label={`Remove ${d.name}`}><X className="w-4.5 h-4.5" /></button>
              </div>
            ))}
            {extraDocs.length < MAX_EXTRA_DOCS && (
              <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40 px-4 py-3.5 text-sm font-semibold text-slate-600 cursor-pointer">
                <Plus className="w-4.5 h-4.5" /> {extraDocs.length ? 'Add more documents' : 'Add documents'}
                <input data-testid="reg-add-docs" type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={onExtraDocs} />
              </label>
            )}
            {docNote && <p data-testid="reg-doc-note" className="m-0 text-xs font-medium text-amber-700">{docNote}</p>}
            {errors.extraDocs && <p className="m-0 text-xs font-medium text-rose-600">{errors.extraDocs}</p>}
          </div>

          <div className="pt-5 border-t border-slate-100 space-y-3" data-testid="reg-emergency-section">
            <div>
              <h3 className="m-0 text-[15px] font-bold text-slate-900">Emergency contact <span className="font-normal text-slate-400">(optional)</span></h3>
              <p className="m-0 mt-1 text-xs text-slate-500">Someone we can call if there is an emergency. You can skip this, or add one person.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Contact name" error={errors.emergencyName}><input data-testid="reg-em-name" className={inputCls} value={form.emergencyName} onChange={(e) => { set('emergencyName')(e); setErrors((x) => ({ ...x, emergencyName: '', emergencyPhone: '' })); }} maxLength={80} autoComplete="off" /></Field>
              <Field label="Relationship">
                <select data-testid="reg-em-rel" className={inputCls} value={form.emergencyRelationship} onChange={set('emergencyRelationship')}>
                  <option value="">Select</option>
                  {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Mobile number" error={errors.emergencyPhone}><input data-testid="reg-em-phone" className={inputCls} inputMode="numeric" maxLength={10} value={form.emergencyPhone} onChange={(e) => { setForm((f) => ({ ...f, emergencyPhone: e.target.value.replace(/\D/g, '') })); setErrors((x) => ({ ...x, emergencyPhone: '' })); }} autoComplete="off" /></Field>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-5 border-t border-slate-100">
            <Field label="Password *" error={errors.password}><input className={inputCls} type="password" value={form.password} onChange={set('password')} autoComplete="new-password" /></Field>
            <Field label="Confirm password *" error={errors.confirm}><input className={inputCls} type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" /></Field>
          </div>

          <button type="submit" className={`${btnPrimary} w-full`} disabled={busy || photo.uploading || idDoc.uploading || extraDocs.some((d) => d.uploading)}>
            <UserPlus className="w-4.5 h-4.5" /> {busy ? 'Submitting…' : 'Submit registration'}
          </button>
          <p className="text-center text-sm text-slate-500 m-0">Already registered? <Link to="/employee/login" className="font-semibold text-emerald-700 hover:underline">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
