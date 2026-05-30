// Vehicle.tsx (Updated)
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Car,
  Edit,
  Trash2,
  FileText,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import supabase from '../../../utils/supabase';
import useHeaderStore from '../../../store/headerStore';
import AddVehicleInsurance from './AddVehicleInsurance';
import EditVehicleInsurance from './EditVehicleInsurance';

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
  created_at: string;
}

const Vehicle = () => {
  const { setTitle } = useHeaderStore();

  const [data, setData] = useState<VehicleInsurance[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState<VehicleInsurance | null>(null);

  useEffect(() => {
    setTitle('Vehicle Insurance');
    fetchVehicleInsurance();
  }, []);

  const fetchVehicleInsurance = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('vehicle_insurance')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      setData(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load vehicle insurance');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this record?'
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('vehicle_insurance')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Deleted Successfully');
      fetchVehicleInsurance();
    } catch (error) {
      console.error(error);
      toast.error('Delete failed');
    }
  };

  const handleViewFile = (item: VehicleInsurance) => {
    const fileLink = item.file_url || item.policy_link;
    
    if (fileLink) {
      window.open(fileLink, '_blank');
    } else {
      toast.error('No file or policy link available');
    }
  };

  const handleEdit = (item: VehicleInsurance) => {
    setSelectedInsurance(item);
    setIsEditModalOpen(true);
  };

  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.company_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.registration_no
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.make
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.model
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesCompany = filterCompany
      ? item.company_name === filterCompany
      : true;

    return matchesSearch && matchesCompany;
  });

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN');
  };

  const formatAmount = (amount: number) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const companies = [
    ...new Set(
      data
        .map((item) => item.company_name)
        .filter(Boolean)
    ),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">

        {/* Header - UI Refinement */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Car className="text-indigo-600" size={24} />
                  Vehicle Insurance
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  Manage all vehicle insurance records
                </p>
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-sm hover:shadow-md"
              >
                <Plus size={18} />
                Add New Insurance
              </button>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="p-6 bg-gray-50 rounded-b-xl">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search by company, registration, make or model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition min-w-[200px]"
              >
                <option value="">All Companies</option>
                {companies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Table - UI Refinement */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs uppercase text-gray-600 font-semibold tracking-wider">
                  <th className="px-6 py-4 text-left">S.NO</th>
                  <th className="px-6 py-4 text-left">COMPANY NAME</th>
                  <th className="px-6 py-4 text-left">REGISTRATION NO.</th>
                  <th className="px-6 py-4 text-left">MAKE</th>
                  <th className="px-6 py-4 text-left">MODEL</th>
                  <th className="px-6 py-4 text-left">INSURANCE AGENT</th>
                  <th className="px-6 py-4 text-left">PERIOD</th>
                  <th className="px-6 py-4 text-right">PREMIUM</th>
                  <th className="px-6 py-4 text-left">ADD ON</th>
                  <th className="px-6 py-4 text-center">POLICY</th>
                  <th className="px-6 py-4 text-center">ACTION</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-indigo-50/30 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-indigo-600">
                        {item.serial_no || `VEH-${item.id}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {item.company_name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.registration_no}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.make}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.model}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.insurance_agent}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {formatDate(item.period_from)}
                      <br />
                      to
                      <br />
                      {formatDate(item.period_to)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {formatAmount(item.premium_paid)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.add_on || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(item.file_url || item.policy_link) ? (
                        <button
                          onClick={() => handleViewFile(item)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition text-sm font-medium"
                        >
                          <FileText size={14} />
                          View
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Car size={48} className="text-gray-300" />
                        <p>No Vehicle Insurance Records Found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddVehicleInsurance
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchVehicleInsurance}
      />

      <EditVehicleInsurance
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedInsurance(null);
        }}
        onSuccess={fetchVehicleInsurance}
        insuranceData={selectedInsurance}
      />
    </>
  );
};

export default Vehicle;