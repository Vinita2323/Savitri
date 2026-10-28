import React, { useState } from 'react';
import { useEmployee } from '../context/EmployeeContext';
import { EmployeeHeader } from '../components/EmployeeHeader';
import {
  CalendarDays,
  Clock,
  Plus,
  Moon,
  Sun,
  Calendar,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const EmployeeShiftsHolidaysPage = ({ onNavigate }) => {
  const { shifts = [], holidays = [], handleCreateShift, handleCreateHoliday } = useEmployee();

  const [activeTab, setActiveTab] = useState('SHIFTS'); // 'SHIFTS' | 'HOLIDAYS'

  // Shift Modal
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftName, setShiftName] = useState('');
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('18:30');
  const [isOvernight, setIsOvernight] = useState(false);
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [weeklyOffs, setWeeklyOffs] = useState(['Sunday']);

  // Holiday Modal
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayDesc, setHolidayDesc] = useState('');

  const toggleDay = (day) => {
    if (weeklyOffs.includes(day)) {
      setWeeklyOffs(weeklyOffs.filter((d) => d !== day));
    } else {
      setWeeklyOffs([...weeklyOffs, day]);
    }
  };

  const handleShiftSubmit = async (e) => {
    e.preventDefault();
    if (!shiftName || !startTime || !endTime) return;

    await handleCreateShift({
      name: shiftName.trim(),
      startTime,
      endTime,
      isOvernight,
      graceMinutes: Number(graceMinutes) || 15,
      weeklyOffs,
    });

    setIsShiftModalOpen(false);
    setShiftName('');
  };

  const handleHolidaySubmit = async (e) => {
    e.preventDefault();
    if (!holidayName || !holidayDate) return;

    await handleCreateHoliday({
      name: holidayName.trim(),
      date: holidayDate,
      description: holidayDesc.trim(),
    });

    setIsHolidayModalOpen(false);
    setHolidayName('');
    setHolidayDate('');
    setHolidayDesc('');
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-12">
      <EmployeeHeader activeTabName="shifts" onNavigate={onNavigate} />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Sub-tab Switcher and Action */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('SHIFTS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'SHIFTS'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Shift Timing Configurations</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('HOLIDAYS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'HOLIDAYS'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-4 h-4 text-purple-600" />
              <span>Holiday Calendar (2026)</span>
            </button>
          </div>

          {activeTab === 'SHIFTS' ? (
            <button
              type="button"
              onClick={() => setIsShiftModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Working Shift</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsHolidayModalOpen(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Holiday</span>
            </button>
          )}
        </div>

        {/* ── SHIFTS GRID ── */}
        {activeTab === 'SHIFTS' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((s) => (
              <div
                key={s._id}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{s.name}</h4>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">
                        Brand: {s.brandId || 'All Brands'}
                      </span>
                    </div>
                    {s.isOvernight ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Moon className="w-3 h-3" /> Overnight
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <Sun className="w-3 h-3" /> Day Shift
                      </span>
                    )}
                  </div>

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Start Time</span>
                      <span className="text-sm font-bold text-slate-800">{s.startTime}</span>
                    </div>
                    <span className="text-slate-300 font-bold">→</span>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">End Time</span>
                      <span className="text-sm font-bold text-slate-800">{s.endTime}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Grace</span>
                      <span className="text-xs font-bold text-emerald-700">{s.graceMinutes}m</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[11px]">
                    Off: <strong>{s.weeklyOffs?.join(', ') || 'None'}</strong>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── HOLIDAYS LIST ── */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Holiday Name</th>
                  <th className="py-3.5 px-4">Scope</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {holidays.map((h) => {
                  const d = new Date(h.date || h.dateString);
                  return (
                    <tr key={h._id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {h.dateString || h.date}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{h.name}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {h.brandId === 'ALL' ? 'All Brands' : h.brandId}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{h.description || '-'}</td>
                      <td className="py-3 px-4 text-slate-600 font-semibold">
                        {d.toLocaleDateString('en-IN', { weekday: 'long' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ADD SHIFT MODAL ── */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Add Shift Configuration</h3>
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleShiftSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Shift Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Afternoon Retail Shift"
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Start Time (24h) *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">End Time (24h) *</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Late Grace (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={graceMinutes}
                    onChange={(e) => setGraceMinutes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="overnightChk"
                    checked={isOvernight}
                    onChange={(e) => setIsOvernight(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <label htmlFor="overnightChk" className="font-bold text-slate-700 cursor-pointer">
                    Overnight Shift
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Weekly Offs</label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEK_DAYS.map((day) => {
                    const isSelected = weeklyOffs.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD HOLIDAY MODAL ── */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Add Calendar Holiday</h3>
              <button
                type="button"
                onClick={() => setIsHolidayModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleHolidaySubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Holiday Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gandhi Jayanti"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Optional notes or details"
                  value={holidayDesc}
                  onChange={(e) => setHolidayDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
                >
                  Add to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeShiftsHolidaysPage;
