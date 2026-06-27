import React, { useState, useEffect } from 'react';
import useHeaderStore from '../../../store/headerStore';
import { Search, FileText, X, Calendar, Upload, RotateCcw, ShieldAlert, BadgeAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';
import supabase from '../../../utils/supabase';

interface VehicleInsurance {
  id: number;
  serial_no: string;
  company_name: string;
  registration_no: string;
  make: string;
  model: string;
  insurance_agent: string;
  period_from: string;
  period_to: string;
  premium_paid: number;
  add_on: string;
  policy_link: string;
  file_url?: string;
  rc_url?: string;
  created_at: string;
  need_renewal?: boolean;
  renewal_date?: string;
  concern_person_name?: string;
  concern_person_mobile?: string;
  concern_person_department?: string;
}

interface RenewalLog {
  id: number;
  serial_no: string;
  last_renewal_date: string | null;
  old_image: string | null;
  need_renewal: boolean;
  new_renewal_date: string | null;
  new_image: string | null;
  created_at: string;
}

const VehicleRenewal = () => {
  const { setTitle } = useHeaderStore();

  useEffect(() => {
    setTitle('Vehicle Insurance Renewal');
  }, [setTitle]);

  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingData, setPendingData] = useState<VehicleInsurance[]>([]);
  const [historyData, setHistoryData] = useState<RenewalLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VehicleInsurance | null>(null);

  // Form State
  const [againRenewal, setAgainRenewal] = useState(true);
  const [nextRenewalDate, setNextRenewalDate] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Fetch pending renewals (need_renewal = true)
      const { data: pending, error: pendingErr } = await supabase
        .from('vehicle_insurance')
        .select('*')
        .eq('need_renewal', true);

      if (pendingErr) throw pendingErr;
      setPendingData(pending || []);

      // Fetch history logs
      const { data: history, error: historyErr } = await supabase
        .from('vehicle_insurance_renewal')
        .select('*')
        .order('created_at', { ascending: false });

      if (historyErr) throw historyErr;
      setHistoryData(history || []);
    } catch (err) {
      console.error('Error loading vehicle renewals:', err);
      toast.error('Failed to load renewals data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const pendingFiltered = pendingData.filter(
    (item) =>
      item.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.registration_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serial_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.concern_person_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.concern_person_mobile || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const historyFiltered = historyData.filter((item) =>
    item.serial_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenRenewal = (item: VehicleInsurance) => {
    setSelectedItem(item);
    setAgainRenewal(true);
    setNextRenewalDate('');
    setNewFileName('');
    setSelectedFile(null);
    setIsRenewalModalOpen(true);
  };

  const handleCloseRenewal = () => {
    setIsRenewalModalOpen(false);
    setSelectedItem(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        e.target.value = '';
        return;
      }
      setNewFileName(file.name);
      setSelectedFile(file);
    }
  };

  const handleSaveRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    if (againRenewal && !nextRenewalDate) {
      toast.error('Please select Next Renewal Date');
      return;
    }

    setIsSaving(true);

    try {
      let uploadedFileUrl = selectedItem.file_url || null;

      // 1. Upload new document if chosen
      if (selectedFile) {
        const cleanFileName = newFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `vehicle/${Date.now()}_${cleanFileName}`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('insurance')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage
          .from('insurance')
          .getPublicUrl(uploadData.path);

        uploadedFileUrl = publicUrl;
      }

      // 2. Update the vehicle insurance record
      const mainUpdates = {
        need_renewal: againRenewal,
        renewal_date: againRenewal ? nextRenewalDate : null,
        file_url: uploadedFileUrl,
      };

      const { error: updateErr } = await supabase
        .from('vehicle_insurance')
        .update(mainUpdates)
        .eq('id', selectedItem.id);

      if (updateErr) throw updateErr;

      // 3. Log to history table
      const historyLog = {
        serial_no: selectedItem.serial_no,
        last_renewal_date: selectedItem.renewal_date || null,
        old_image: selectedItem.file_url || null,
        need_renewal: againRenewal,
        new_renewal_date: againRenewal ? nextRenewalDate : null,
        new_image: uploadedFileUrl,
      };

      const { error: logErr } = await supabase
        .from('vehicle_insurance_renewal')
        .insert([historyLog]);

      if (logErr) throw logErr;

      toast.success('Renewal processed successfully');
      handleCloseRenewal();
      loadData();
    } catch (err) {
      console.error('Error saving renewal:', err);
      toast.error('Failed to save renewal log');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Insurance Renewals</h1>
          <p className="text-sm text-gray-500 mt-1">Manage pending renewals and renewal logs</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search renewals..."
              className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Refresh */}
          <button
            onClick={loadData}
            title="Refresh Data"
            className="p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 hover:text-indigo-600 transition-colors"
            disabled={isLoading}
          >
            <RotateCcw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'pending'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending ({pendingData.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              History ({historyData.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'pending' ? (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                  <tr>
                    <th className="p-4 text-center">Action</th>
                    <th className="p-4">Serial No</th>
                    <th className="p-4">Company Name</th>
                    <th className="p-4">Registration No</th>
                    <th className="p-4">Make / Model</th>
                    <th className="p-4">Insurance Agent</th>
                    <th className="p-4">Period To</th>
                    <th className="p-4">Renewal Date</th>
                    <th className="p-4">CONCERN PERSON</th>
                    <th className="p-4">CONCERN MOBILE</th>
                    <th className="p-4">CONCERN DEPT</th>
                    <th className="p-4">Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {pendingFiltered.length > 0 ? (
                    pendingFiltered.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleOpenRenewal(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                          >
                            <RotateCcw size={14} />
                            Renewal
                          </button>
                        </td>
                        <td className="p-4 font-semibold text-indigo-600">{item.serial_no}</td>
                        <td className="p-4 font-medium text-gray-900">{item.company_name}</td>
                        <td className="p-4 text-gray-600 font-mono">{item.registration_no}</td>
                        <td className="p-4 text-gray-600">
                          {item.make} / {item.model}
                        </td>
                        <td className="p-4 text-gray-500">{item.insurance_agent}</td>
                        <td className="p-4 text-gray-500">{formatDate(item.period_to)}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            {formatDate(item.renewal_date)}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600">{item.concern_person_name || '-'}</td>
                        <td className="p-4 text-gray-600">{item.concern_person_mobile || '-'}</td>
                        <td className="p-4 text-gray-500">{item.concern_person_department || '-'}</td>
                        <td className="p-4">
                          {item.file_url ? (
                            <a
                              href={item.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              <FileText size={14} />
                              View Policy
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center py-16 text-gray-400">
                        <ShieldAlert className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                        No pending renewals found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                  <tr>
                    <th className="p-4">Serial No</th>
                    <th className="p-4">Last Renewal Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">New Renewal Date</th>
                    <th className="p-4">Logged At</th>
                    <th className="p-4">Old Document</th>
                    <th className="p-4">New Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {historyFiltered.length > 0 ? (
                    historyFiltered.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-4 font-semibold text-indigo-600">{log.serial_no}</td>
                        <td className="p-4 text-gray-500">{formatDate(log.last_renewal_date)}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              log.need_renewal
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-green-50 text-green-800 border border-green-200'
                            }`}
                          >
                            {log.need_renewal ? 'Renewable' : 'Completed'}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-gray-700">
                          {log.need_renewal ? formatDate(log.new_renewal_date) : 'No Renewal Required'}
                        </td>
                        <td className="p-4 text-xs text-gray-400">{formatDate(log.created_at)}</td>
                        <td className="p-4">
                          {log.old_image ? (
                            <a
                              href={log.old_image}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-gray-500 hover:text-indigo-600 underline flex items-center gap-0.5"
                            >
                              <FileText size={12} /> View Old
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-4">
                          {log.new_image ? (
                            <a
                              href={log.new_image}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline flex items-center gap-0.5"
                            >
                              <FileText size={12} /> View New
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-gray-400">
                        <BadgeAlert className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                        No renewal history logs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Renewal Dialog Modal */}
      {isRenewalModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <RotateCcw className="text-indigo-600 h-5 w-5" />
                <h3 className="font-bold text-gray-800">Renew Vehicle Insurance</h3>
              </div>
              <button
                onClick={handleCloseRenewal}
                disabled={isSaving}
                className="text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-150 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRenewal} className="p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vehicle Details</p>
                <div className="mt-1.5 p-3 rounded-lg bg-gray-50 text-xs space-y-1 text-gray-700">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-500">Serial No:</span>
                    <span className="font-bold text-indigo-600">{selectedItem.serial_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-500">Registration No:</span>
                    <span className="font-semibold font-mono text-gray-900">{selectedItem.registration_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-500">Company Name:</span>
                    <span className="font-semibold text-gray-900">{selectedItem.company_name}</span>
                  </div>
                </div>
              </div>

              {/* Do you want to renew again */}
              <div className="flex items-center gap-2.5 p-1">
                <input
                  type="checkbox"
                  id="againRenewal"
                  checked={againRenewal}
                  onChange={(e) => setAgainRenewal(e.target.checked)}
                  className="h-4.5 w-4.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="againRenewal" className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
                  Do you want to renew again?
                </label>
              </div>

              {/* Next Renewal Date */}
              {againRenewal && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Next Renewal Date *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4.5 w-4.5" />
                    <input
                      type="date"
                      required={againRenewal}
                      value={nextRenewalDate}
                      onChange={(e) => setNextRenewalDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-gray-50/50"
                    />
                  </div>
                </div>
              )}

              {/* New Document File */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Upload New Policy Document</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="new-policy-file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label
                    htmlFor="new-policy-file"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:border-indigo-500 hover:text-indigo-600 bg-white rounded-lg cursor-pointer text-xs font-semibold shadow-sm transition shrink-0"
                  >
                    <Upload size={14} />
                    Choose File
                  </label>
                  <span className="text-xs text-gray-500 truncate max-w-[200px]">
                    {newFileName || 'No file selected'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseRenewal}
                  disabled={isSaving}
                  className="flex-1 py-2.5 border rounded-lg font-semibold hover:bg-gray-100 transition text-sm text-gray-700 bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition text-sm flex items-center justify-center gap-1.5"
                >
                  {isSaving ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  ) : (
                    'Save Renewal'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleRenewal;
