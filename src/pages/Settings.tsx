import { useState, useEffect } from 'react';
import { Plus, X, Check, Search, Edit2, Trash2 } from 'lucide-react';
import useAuthStore, { User as UserType } from '../store/authStore';
import useHeaderStore from '../store/headerStore';
import { toast } from 'react-hot-toast';
import supabase from '../utils/supabase';

const Settings = () => {
    const { setTitle } = useHeaderStore();
    const { users, addUser, updateUser, deleteUser, currentUser, setUsers } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'user' | 'master'>('user');
    const [searchTerm, setSearchTerm] = useState('');

    // Master Data State
    const [masterRecords, setMasterRecords] = useState<any[]>([]);
    const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
    const [editingMasterRecord, setEditingMasterRecord] = useState<any | null>(null);
    const [masterFormData, setMasterFormData] = useState({
        document_type: '',
        category: '',
        renewal_filter: '',
        director_name: '',
        company_name: ''
    });

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const { data: fetchedUsers, error } = await supabase
                .from('login')
                .select('*');

            if (error) throw error;

            if (fetchedUsers && fetchedUsers.length > 0) {
                const activeUsers = fetchedUsers.map((user: any) => ({
                    id: user.username || user.id?.toString(),
                    name: user.name || '',
                    password: user.password || '',
                    role: user.role || 'user',
                    permissions: user.pages ? user.pages.split(',').map((p: string) => p.trim()).filter(Boolean) : [],
                    deleted: user.deleted || false,
                    originalId: user.id
                }));
                setUsers(activeUsers);
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error("Failed to load users", error);
            toast.error("Failed to load users from Supabase");
        } finally {
            setIsLoading(false);
        }
    };

    const loadMasterRecords = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('master')
                .select('*')
                .order('id', { ascending: false });

            if (error) throw error;
            setMasterRecords(data || []);
        } catch (error) {
            console.error("Failed to load master records", error);
            toast.error("Failed to load master records");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setTitle('Settings');
        loadUsers();
        loadMasterRecords();
    }, [setTitle, setUsers]);

    // User Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserType | null>(null);

    // User Form State
    const [formData, setFormData] = useState<Partial<UserType>>({
        name: '',
        id: '',
        password: '',
        role: 'user',
        permissions: []
    });

    const availablePermissions = ['Dashboard', 'Resource Manager', 'Loan', 'Settings', 'BG'];

    const openAddUserModal = () => {
        setEditingUser(null);
        setFormData({
            name: '',
            id: '',
            password: '',
            role: 'user',
            permissions: ['Dashboard']
        });
        setIsModalOpen(true);
    };

    const openEditUserModal = (user: UserType) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            id: user.id,
            password: user.password,
            role: user.role,
            permissions: user.permissions
        });
        setIsModalOpen(true);
    };

    const handlePermissionToggle = (perm: string) => {
        setFormData(prev => {
            const currentPermissions = prev.permissions || [];
            if (currentPermissions.includes(perm)) {
                return { ...prev, permissions: currentPermissions.filter(p => p !== perm) };
            } else {
                return { ...prev, permissions: [...currentPermissions, perm] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.id || !formData.password) {
            toast.error('Username and password are required');
            return;
        }

        if (editingUser) {
            try {
                toast.loading("Updating user in Supabase...", { id: "update-user" });

                const { error } = await supabase
                    .from('login')
                    .update({
                        password: formData.password,
                        role: formData.role,
                        pages: (formData.permissions || []).join(', ')
                    })
                    .eq('username', editingUser.id);

                if (error) throw error;

                updateUser(editingUser.id, formData);
                toast.success('User updated successfully', { id: "update-user" });
            } catch (error) {
                console.error("Failed to update user", error);
                toast.error('Failed to update user in Supabase', { id: "update-user" });
            }
        } else {
            try {
                toast.loading("Saving user to Supabase...", { id: "save-user" });

                const { error } = await supabase
                    .from('login')
                    .insert([{
                        name: formData.name,
                        username: formData.id,
                        password: formData.password,
                        role: formData.role,
                        pages: (formData.permissions || []).join(', '),
                        deleted: false
                    }]);

                if (error) {
                    if (error.code === '23505') {
                        toast.error('Username already exists', { id: "save-user" });
                    } else {
                        throw error;
                    }
                    return;
                }

                const success = addUser(formData as UserType);
                if (!success) {
                    toast.error('User already exists locally', { id: "save-user" });
                } else {
                    toast.success('User added successfully', { id: "save-user" });
                }
            } catch (error) {
                console.error("Failed to save user", error);
                toast.error('Failed to save to Supabase', { id: "save-user" });
            }
        }
        setIsModalOpen(false);
    };

    const handleDeleteUser = async (id: string) => {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                toast.loading("Deleting user...", { id: "delete-user" });

                const { error } = await supabase
                    .from('login')
                    .delete()
                    .eq('username', id);

                if (error) throw error;

                deleteUser(id);
                toast.success('User deleted successfully', { id: "delete-user" });
            } catch (error) {
                console.error("Failed to delete user in Supabase", error);
                toast.error('Failed to update Supabase', { id: "delete-user" });
            }
        }
    };

    // Master handlers
    const openAddMasterModal = () => {
        setEditingMasterRecord(null);
        setMasterFormData({
            document_type: '',
            category: '',
            renewal_filter: '',
            director_name: '',
            company_name: ''
        });
        setIsMasterModalOpen(true);
    };

    const openEditMasterModal = (record: any) => {
        setEditingMasterRecord(record);
        setMasterFormData({
            document_type: record.document_type || '',
            category: record.category || '',
            renewal_filter: record.renewal_filter || '',
            director_name: record.director_name || '',
            company_name: record.company_name || ''
        });
        setIsMasterModalOpen(true);
    };

    const handleMasterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!masterFormData.document_type && !masterFormData.category && !masterFormData.renewal_filter && !masterFormData.director_name && !masterFormData.company_name) {
            toast.error('Please fill at least one field');
            return;
        }

        try {
            if (editingMasterRecord) {
                toast.loading("Updating master record...", { id: "master-record" });

                const { error } = await supabase
                    .from('master')
                    .update({
                        document_type: masterFormData.document_type || null,
                        category: masterFormData.category || null,
                        renewal_filter: masterFormData.renewal_filter || null,
                        director_name: masterFormData.director_name || null,
                        company_name: masterFormData.company_name || null
                    })
                    .eq('id', editingMasterRecord.id);

                if (error) throw error;

                toast.success('Master record updated successfully', { id: "master-record" });
            } else {
                toast.loading("Saving master record...", { id: "master-record" });

                const { error } = await supabase
                    .from('master')
                    .insert([{
                        document_type: masterFormData.document_type || null,
                        category: masterFormData.category || null,
                        renewal_filter: masterFormData.renewal_filter || null,
                        director_name: masterFormData.director_name || null,
                        company_name: masterFormData.company_name || null
                    }]);

                if (error) throw error;

                toast.success('Master record added successfully', { id: "master-record" });
            }
            setIsMasterModalOpen(false);
            loadMasterRecords();
        } catch (error) {
            console.error("Failed to save master record", error);
            toast.error('Failed to save to Supabase', { id: "master-record" });
        }
    };

    const handleDeleteMaster = async (id: number) => {
        if (confirm('Are you sure you want to delete this master record?')) {
            try {
                toast.loading("Deleting master record...", { id: "delete-master" });

                const { error } = await supabase
                    .from('master')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                toast.success('Master record deleted successfully', { id: "delete-master" });
                loadMasterRecords();
            } catch (error) {
                console.error("Failed to delete master record", error);
                toast.error('Failed to delete from Supabase', { id: "delete-master" });
            }
        }
    };

    // Filters
    const filteredUsers = users.filter(user => 
        user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredMaster = masterRecords.filter(record => 
        (record.document_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.renewal_filter || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.director_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.id.toString().includes(searchTerm)
    );

    return (
        <div className="p-6 md:p-8 space-y-6 h-full bg-white">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {activeTab === 'user' 
                            ? 'Manage team members and permissions' 
                            : 'Manage master drop-down and form list options'}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder={activeTab === 'user' ? 'Find a user...' : 'Search master data...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none transition-all text-sm"
                        />
                    </div>

                    <button
                        onClick={activeTab === 'user' ? openAddUserModal : openAddMasterModal}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={16} />
                        {activeTab === 'user' ? 'Add User' : 'Add Master Record'}
                    </button>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => {
                        setActiveTab('user');
                        setSearchTerm('');
                    }}
                    className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all ${
                        activeTab === 'user'
                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    User Management
                </button>
                <button
                    onClick={() => {
                        setActiveTab('master');
                        setSearchTerm('');
                    }}
                    className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all ${
                        activeTab === 'master'
                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    Master Data Management
                </button>
            </div>

            {/* Content Area */}
            <div className="animate-fade-in">
                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : activeTab === 'user' ? (
                    /* Users Table */
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[300px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                                    <tr className="text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4 w-1/2">Access Permissions</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredUsers.map((user: UserType) => (
                                        <tr key={user.id} className="hover:bg-gray-50/60 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm
                                                        ${user.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                        {user.id.charAt(0).toUpperCase()}
                                                    </div>
                                                    <p className="font-semibold text-sm text-gray-900">{user.id}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider
                                                    ${user.role === 'admin'
                                                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                                        : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {user.permissions?.slice(0, 4).map((perm: string) => (
                                                        <span key={perm} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100">
                                                            {perm}
                                                        </span>
                                                    ))}
                                                    {(user.permissions?.length || 0) > 4 && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-400 border border-gray-100">
                                                            +{(user.permissions?.length || 0) - 4}
                                                        </span>
                                                    )}
                                                    {(!user.permissions || user.permissions.length === 0) && (
                                                        <span className="text-xs text-gray-400 italic">No specific permissions</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={() => openEditUserModal(user)}
                                                        className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                        title="Edit User"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    {user.id !== currentUser?.id && (
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic text-sm">
                                                No users found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {filteredUsers.map((user: UserType) => (
                                <div key={user.id} className="p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg border border-indigo-100">
                                                {user.id.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-base">{user.id}</p>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Permissions</p>
                                        <div className="flex flex-wrap gap-2">
                                            {user.permissions?.map((perm: string) => (
                                                <span key={perm} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                                    {perm}
                                                </span>
                                            ))}
                                            {(user.permissions?.length || 0) === 0 && (
                                                <span className="text-xs text-gray-400 italic">No permissions assigned</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2 border-t border-gray-50">
                                        <button
                                            onClick={() => openEditUserModal(user)}
                                            className="flex-1 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-sm font-bold"
                                        >
                                            Edit User
                                        </button>
                                        {user.id !== currentUser?.id && (
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="flex-1 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-bold"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {filteredUsers.length === 0 && (
                                <div className="p-8 text-center text-gray-400 italic text-sm">
                                    No users found
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Master Table View */
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[300px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                                    <tr className="text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                        <th className="px-6 py-4 w-16">ID</th>
                                        <th className="px-6 py-4">Document Type</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Renewal Filter</th>
                                        <th className="px-6 py-4">Director Name</th>
                                        <th className="px-6 py-4">Company Name</th>
                                        <th className="px-6 py-4 text-right w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredMaster.map((record) => (
                                        <tr key={record.id} className="hover:bg-gray-50/60 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-xs text-gray-400">
                                                #{record.id}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                                {record.document_type || <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {record.category || <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {record.renewal_filter || <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {record.director_name || <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {record.company_name || <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={() => openEditMasterModal(record)}
                                                        className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                        title="Edit Record"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMaster(record.id)}
                                                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredMaster.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-gray-400 italic text-sm">
                                                No master records found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Master Card View */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {filteredMaster.map((record) => (
                                <div key={record.id} className="p-5 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-mono text-xs text-gray-400 font-semibold">#{record.id}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <p className="text-gray-400 uppercase font-semibold">Doc Type</p>
                                            <p className="text-gray-900 font-medium">{record.document_type || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 uppercase font-semibold">Category</p>
                                            <p className="text-gray-900 font-medium">{record.category || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 uppercase font-semibold">Renewal Filter</p>
                                            <p className="text-gray-900 font-medium">{record.renewal_filter || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 uppercase font-semibold">Director</p>
                                            <p className="text-gray-900 font-medium">{record.director_name || '-'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-gray-400 uppercase font-semibold">Company</p>
                                            <p className="text-gray-900 font-medium">{record.company_name || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-2 border-t border-gray-50">
                                        <button
                                            onClick={() => openEditMasterModal(record)}
                                            className="flex-1 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-sm font-bold"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMaster(record.id)}
                                            className="flex-1 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-bold"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredMaster.length === 0 && (
                                <div className="p-8 text-center text-gray-400 italic text-sm">
                                    No master records found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* User Logic Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform scale-100 transition-all">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingUser ? 'Edit User Details' : 'Create New User'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Name</label>
                                        <input
                                            type="text"
                                            required
                                            disabled={!!editingUser}
                                            className={`w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${editingUser ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white font-medium'}`}
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Username</label>
                                        <input
                                            type="text"
                                            required
                                            disabled={!!editingUser}
                                            className={`w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${editingUser ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white font-medium'}`}
                                            value={formData.id}
                                            onChange={e => setFormData({ ...formData, id: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Role</label>
                                        <select
                                            className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Password</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Page Permissions</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {availablePermissions.map(perm => (
                                            <label key={perm} className={`
                                        flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all
                                        ${(formData.permissions || []).includes(perm)
                                                    ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                                    : 'border-gray-100 hover:bg-gray-50'}
                                    `}>
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${(formData.permissions || []).includes(perm)
                                                    ? 'bg-indigo-600 border-indigo-600'
                                                    : 'border-gray-300 bg-white'
                                                    }`}>
                                                    {(formData.permissions || []).includes(perm) && <Check size={14} className="text-white" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={(formData.permissions || []).includes(perm)}
                                                    onChange={() => handlePermissionToggle(perm)}
                                                />
                                                <span className={`text-sm font-medium ${(formData.permissions || []).includes(perm) ? 'text-indigo-900' : 'text-gray-600'}`}>
                                                    {perm}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
                                >
                                    {editingUser ? 'Save Changes' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Master Logic Modal */}
            {isMasterModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform scale-100 transition-all">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingMasterRecord ? 'Edit Master Record' : 'Create New Master Record'}
                            </h2>
                            <button onClick={() => setIsMasterModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleMasterSubmit} className="p-6 space-y-5">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Document Type</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                                        value={masterFormData.document_type}
                                        onChange={e => setMasterFormData({ ...masterFormData, document_type: e.target.value })}
                                        placeholder="e.g. Agreement, Certificate"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Category</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                                        value={masterFormData.category}
                                        onChange={e => setMasterFormData({ ...masterFormData, category: e.target.value })}
                                        placeholder="e.g. Personal, Company, Director"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Renewal Filter</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                                        value={masterFormData.renewal_filter}
                                        onChange={e => setMasterFormData({ ...masterFormData, renewal_filter: e.target.value })}
                                        placeholder="e.g. Active, Expired"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Director Name</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                                        value={masterFormData.director_name}
                                        onChange={e => setMasterFormData({ ...masterFormData, director_name: e.target.value })}
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Company Name</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                                        value={masterFormData.company_name}
                                        onChange={e => setMasterFormData({ ...masterFormData, company_name: e.target.value })}
                                        placeholder="e.g. Botivate"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsMasterModalOpen(false)}
                                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
                                >
                                    {editingMasterRecord ? 'Save Changes' : 'Create Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
