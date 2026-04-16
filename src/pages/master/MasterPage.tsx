import { useState, useEffect } from 'react';
import { Search, Database, Layers, Tag, Building2, Plus, Pencil, Trash2, Check, X, Loader2, RefreshCw } from 'lucide-react';
import useHeaderStore from '../../store/headerStore';
import useDataStore, { MasterItem } from '../../store/dataStore';
import AddMaster from './AddMaster';
import supabase from '../../utils/supabase';
import { toast } from 'react-hot-toast';

interface MasterRecord {
    id: string;
    company_name: string;
    document_type: string;
    category: string;
    director_name: string;
    renewal_filter: string;
}

const MasterPage = () => {
    const { setTitle } = useHeaderStore();
    const store = useDataStore() as any;
    const setMasterData: ((items: MasterItem[]) => void) | undefined = store.setMasterData;

    const [records, setRecords] = useState<MasterRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Inline editing state
    const [editId, setEditId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<MasterRecord>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setTitle('Master Data');
        fetchRecords();
    }, [setTitle]);

    // ─── Fetch from Supabase ───────────────────────────────────────────────
    const fetchRecords = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('master')
                .select('*')
                .order('id', { ascending: false });

            if (error) throw error;

            const mapped: MasterRecord[] = (data || []).map((r: any) => ({
                id: r.id.toString(),
                company_name: r.company_name || '',
                document_type: r.document_type || '',
                category: r.category || '',
                director_name: r.director_name || '',
                renewal_filter: r.renewal_filter || '',
            }));

            setRecords(mapped);

            // Sync with Zustand store so AddDocument dropdowns stay populated
            if (typeof setMasterData === 'function') {
                const storeItems: MasterItem[] = mapped.map(r => ({
                    id: r.id,
                    companyName: r.company_name,
                    documentType: r.document_type,
                    category: r.category,
                }));
                setMasterData(storeItems);
            }
        } catch (error) {
            console.error('Error fetching master data:', error);
            toast.error('Failed to load master records');
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Inline Edit ──────────────────────────────────────────────────────
    const handleEdit = (record: MasterRecord) => {
        setEditId(record.id);
        setEditData({ ...record });
    };

    const handleCancelEdit = () => {
        setEditId(null);
        setEditData({});
    };

    const handleSaveEdit = async (id: string) => {
        try {
            setIsSaving(true);
            const { error } = await supabase
                .from('master')
                .update({
                    company_name: editData.company_name || '',
                    document_type: editData.document_type || '',
                    category: editData.category || '',
                    director_name: editData.director_name || null,
                    renewal_filter: editData.renewal_filter || null,
                })
                .eq('id', id);

            if (error) throw error;

            setRecords(prev =>
                prev.map(r => r.id === id ? { ...r, ...editData } as MasterRecord : r)
            );
            setEditId(null);
            setEditData({});
            toast.success('Record updated successfully');
        } catch (error) {
            console.error('Update error:', error);
            toast.error('Failed to update record');
        } finally {
            setIsSaving(false);
        }
    };

    // ─── Delete ───────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;

        try {
            const { error } = await supabase.from('master').delete().eq('id', id);
            if (error) throw error;
            setRecords(prev => prev.filter(r => r.id !== id));
            toast.success('Record deleted');
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete record');
        }
    };

    // ─── Filter ───────────────────────────────────────────────────────────
    const filteredData = records.filter(item =>
        item.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.document_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.director_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.renewal_filter.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const categoryBadge = (cat: string) => {
        const colours: Record<string, string> = {
            Personal: 'bg-blue-100 text-blue-700',
            Company: 'bg-purple-100 text-purple-700',
            Director: 'bg-amber-100 text-amber-700',
        };
        return colours[cat] || 'bg-gray-100 text-gray-700';
    };

    return (
        <>
            <div className="space-y-6 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Master Data</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {records.length} records · Manage master data
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-center">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search records..."
                                className="pl-9 pr-4 py-2.5 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={fetchRecords}
                            className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500"
                            title="Refresh"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition-all shadow-md font-medium text-sm whitespace-nowrap"
                        >
                            <Plus className="h-4 w-4" />
                            Add New
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs uppercase tracking-wider">
                                    <th className="p-4 font-semibold">#</th>
                                    <th className="p-4 font-semibold">Company Name</th>
                                    <th className="p-4 font-semibold">Document Type</th>
                                    <th className="p-4 font-semibold">Category</th>
                                    <th className="p-4 font-semibold">Director Name</th>
                                    <th className="p-4 font-semibold">Renewal Filter</th>
                                    <th className="p-4 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 size={32} className="text-indigo-500 animate-spin" />
                                                <p className="text-gray-500 text-sm">Loading records...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Database size={40} className="text-gray-200" />
                                                <p className="text-gray-500 text-sm">No records found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="p-4 text-gray-400 text-xs">{index + 1}</td>

                                            {/* Company Name */}
                                            <td className="p-4">
                                                {editId === item.id ? (
                                                    <input
                                                        className="border border-indigo-300 rounded-lg px-3 py-1.5 text-sm w-full focus:ring-2 focus:ring-indigo-400 outline-none"
                                                        value={editData.company_name || ''}
                                                        onChange={e => setEditData({ ...editData, company_name: e.target.value })}
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                                            <Building2 size={14} />
                                                        </div>
                                                        <span className="font-medium text-gray-900">{item.company_name || '—'}</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Document Type */}
                                            <td className="p-4 text-gray-600">
                                                {editId === item.id ? (
                                                    <input
                                                        className="border border-indigo-300 rounded-lg px-3 py-1.5 text-sm w-full focus:ring-2 focus:ring-indigo-400 outline-none"
                                                        value={editData.document_type || ''}
                                                        onChange={e => setEditData({ ...editData, document_type: e.target.value })}
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Layers size={14} className="text-gray-400" />
                                                        {item.document_type || '—'}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Category */}
                                            <td className="p-4">
                                                {editId === item.id ? (
                                                    <select
                                                        className="border border-indigo-300 rounded-lg px-3 py-1.5 text-sm w-full focus:ring-2 focus:ring-indigo-400 outline-none"
                                                        value={editData.category || ''}
                                                        onChange={e => setEditData({ ...editData, category: e.target.value })}
                                                    >
                                                        <option value="">Select</option>
                                                        <option value="Personal">Personal</option>
                                                        <option value="Company">Company</option>
                                                        <option value="Director">Director</option>
                                                    </select>
                                                ) : (
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${categoryBadge(item.category)}`}>
                                                        <Tag size={11} />
                                                        {item.category || '—'}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Director Name */}
                                            <td className="p-4 text-gray-600">
                                                {editId === item.id ? (
                                                    <input
                                                        className="border border-indigo-300 rounded-lg px-3 py-1.5 text-sm w-full focus:ring-2 focus:ring-indigo-400 outline-none"
                                                        value={editData.director_name || ''}
                                                        onChange={e => setEditData({ ...editData, director_name: e.target.value })}
                                                        placeholder="Optional"
                                                    />
                                                ) : (
                                                    <span>{item.director_name || <span className="text-gray-300">—</span>}</span>
                                                )}
                                            </td>

                                            {/* Renewal Filter */}
                                            <td className="p-4 text-gray-600">
                                                {editId === item.id ? (
                                                    <input
                                                        className="border border-indigo-300 rounded-lg px-3 py-1.5 text-sm w-full focus:ring-2 focus:ring-indigo-400 outline-none"
                                                        value={editData.renewal_filter || ''}
                                                        onChange={e => setEditData({ ...editData, renewal_filter: e.target.value })}
                                                        placeholder="Optional"
                                                    />
                                                ) : (
                                                    <span>{item.renewal_filter || <span className="text-gray-300">—</span>}</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4 text-center">
                                                {editId === item.id ? (
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() => handleSaveEdit(item.id)}
                                                            disabled={isSaving}
                                                            className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            {isSaving
                                                                ? <Loader2 size={12} className="animate-spin" />
                                                                : <Check size={12} />
                                                            }
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="flex items-center gap-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                                        >
                                                            <X size={12} />
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() => handleEdit(item)}
                                                            className="flex items-center gap-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                                        >
                                                            <Pencil size={12} />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                                        >
                                                            <Trash2 size={12} />
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {!isLoading && records.length > 0 && (
                        <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-500">
                            Showing {filteredData.length} of {records.length} records
                        </div>
                    )}
                </div>
            </div>

            <AddMaster
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchRecords}
            />
        </>
    );
};

export default MasterPage;
