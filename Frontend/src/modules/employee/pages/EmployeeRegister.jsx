import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, FileText, UserPlus } from 'lucide-react';
import employeePortalService from '../../../services/employeePortalService';
import { Field, Notice, btnPrimary, inputCls, todayIST } from '../components/ui';

const EMPTY = {
  fullName: '', email: '', mobile: '', gender: '', dateOfBirth: '', address: '', city: '', brandId: '',
  department: '', designation: '', joiningDate: todayIST(), assignedAdminId: '', password: '', confirm: '', idProofType: 'Aadhaar Card',
};
const ID_TYPES = ['Aadhaar Card', 'PAN Card', 'Driving Licence', 'Voter ID', 'Passport'];

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
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setApiError('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    if (photo.uploading || idDoc.uploading) return setApiError('Please wait for the upload to finish.');
    setBusy(true);
    try {
      const { confirm, ...body } = form;
      await employeePortalService.register({ ...body, profilePhoto: photo.url, idProofUrl: idDoc.url, assignedAdminId: form.assignedAdminId || undefined });
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

          <div className="grid sm:grid-cols-2 gap-4 pt-5 border-t border-slate-100">
            <Field label="Password *" error={errors.password}><input className={inputCls} type="password" value={form.password} onChange={set('password')} autoComplete="new-password" /></Field>
            <Field label="Confirm password *" error={errors.confirm}><input className={inputCls} type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" /></Field>
          </div>

          <button type="submit" className={`${btnPrimary} w-full`} disabled={busy || photo.uploading || idDoc.uploading}>
            <UserPlus className="w-4.5 h-4.5" /> {busy ? 'Submitting…' : 'Submit registration'}
          </button>
          <p className="text-center text-sm text-slate-500 m-0">Already registered? <Link to="/employee/login" className="font-semibold text-emerald-700 hover:underline">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
