import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  FileText,
  Download,
  Edit,
  Trash2,
  MoreHorizontal,
  Mail,
  MessageCircle,
  Share2,
} from "lucide-react";
import useDataStore from "../../store/dataStore";
import useHeaderStore from "../../store/headerStore";
import AddDocument from "./AddDocument";
import EditDocument from "./EditDocument";
import ShareModal from "./ShareModal";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { formatDate } from "../../utils/dateFormatter";
import supabase from "../../utils/supabase";
import { toast } from "react-hot-toast";
import type { DocumentItem } from "../../store/dataStore";

const AllDocuments = () => {
  const {
    deleteDocument,
    setDocuments: setStoreDocuments,
    documents: storeDocuments,
  } = useDataStore();
  const { setTitle } = useHeaderStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDocumentName, setSelectedDocumentName] = useState("");
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const [selectedConcernPersonName, setSelectedConcernPersonName] = useState("");
  const [fileSizes, setFileSizes] = useState<Record<string, string>>({});

  const formatBytes = (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  useEffect(() => {
    if (documents.length === 0) return;

    let active = true;

    const fetchSizes = async () => {
      // Step 1: List files in DRIVE_FOLDER to get metadata/size in bulk
      const bucketSizes: Record<string, number> = {};
      try {
        const { data, error } = await supabase.storage
          .from("DRIVE_FOLDER")
          .list("", { limit: 1000 });
        if (!error && data) {
          data.forEach((file) => {
            if (file.name && file.metadata?.size) {
              bucketSizes[file.name] = file.metadata.size;
            }
          });
        }
      } catch (e) {
        console.error("Failed to list storage bucket:", e);
      }

      if (!active) return;

      const newSizes: Record<string, string> = {};

      const promises = documents.map(async (doc) => {
        const url = doc.fileContent;
        if (!url) {
          newSizes[doc.id] = "-";
          return;
        }

        // 1. Check if it's base64 data URL
        if (url.startsWith("data:")) {
          const base64Data = url.split(",")[1];
          if (base64Data) {
            const size = Math.round((base64Data.length * 3) / 4);
            newSizes[doc.id] = formatBytes(size);
          } else {
            newSizes[doc.id] = "-";
          }
          return;
        }

        // 2. Try extracting filename if it's stored in DRIVE_FOLDER bucket
        let size: number | null = null;
        if (url.includes("/storage/v1/object/public/DRIVE_FOLDER/")) {
          const parts = url.split("/storage/v1/object/public/DRIVE_FOLDER/");
          const fileName = parts[parts.length - 1];
          if (bucketSizes[fileName] !== undefined) {
            size = bucketSizes[fileName];
          }
        }

        // 3. Fallback to HTTP HEAD request if not in storage list or for external URLs
        if (size === null) {
          try {
            const response = await fetch(url, { method: "HEAD" });
            const contentLength = response.headers.get("content-length");
            if (contentLength) {
              size = parseInt(contentLength, 10);
            }
          } catch (e) {
            console.error(`Failed to fetch HEAD for ${url}:`, e);
          }
        }

        if (size !== null) {
          newSizes[doc.id] = formatBytes(size);
        } else {
          newSizes[doc.id] = "-";
        }
      });

      await Promise.all(promises);

      if (active) {
        setFileSizes(newSizes);
      }
    };

    fetchSizes();

    return () => {
      active = false;
    };
  }, [documents]);

  useEffect(() => {
    setTitle("All Document");
    loadDocuments();
  }, [setTitle]);

  // Helper function to remove duplicate documents
  const deduplicateDocuments = (docs: DocumentItem[]): DocumentItem[] => {
    const uniqueMap = new Map<string, DocumentItem>();

    docs.forEach((doc) => {
      const uniqueKey =
        `${doc.sn}_${doc.documentName}_${doc.companyName}_${doc.category}`
          .toLowerCase()
          .trim();

      if (!uniqueMap.has(uniqueKey)) {
        uniqueMap.set(uniqueKey, doc);
      } else {
        console.warn("Duplicate document found:", {
          serialNo: doc.sn,
          name: doc.documentName,
          company: doc.companyName,
          category: doc.category,
        });
      }
    });

    return Array.from(uniqueMap.values());
  };

  const loadDocuments = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('Add New Document')
        .select('*')
        .eq('is_deleted', false);

      if (error) throw error;

      const mappedDocs: DocumentItem[] = (data || []).map(doc => ({
        id: doc.id ? doc.id.toString() : Math.random().toString(),
        sn: doc.serial_no || (doc.id ? `SN-${doc.id}` : ''),
        documentName: doc.document_name || '',
        documentType: doc.document_type || '',
        category: doc.category || '',
        companyName: doc.company_name || '',
        pName: doc.name || '',
        needsRenewal: doc.need_renewal || false,
        renewalDate: doc.renewal_date || undefined,
        file: doc.image || null,
        fileContent: doc.image || '', // Using URL for view file
        date: doc.created_at || '',
        status: doc.is_deleted ? 'Deleted' : 'Active',
        issueDate: doc.issue_date || undefined,
        concernPersonName: doc.concern_person_name || undefined,
        concernPersonMobile: doc.concern_person_mobile || undefined,
        concernPersonDepartment: doc.concern_person_department || undefined,
        companyBranch: doc.company_name || '',
        sharedExpiryDate: null,
        lastSharedAt: '',
      }));

      const uniqueDocs = deduplicateDocuments(mappedDocs);

      console.log(`Loaded ${uniqueDocs.length} documents from Supabase`);
      setDocuments(uniqueDocs);
      // Replace store data instead of appending to avoid staleness
      setStoreDocuments(uniqueDocs);
    } catch (err: unknown) {
      console.error("Error loading documents from Supabase:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load documents";

      // Fall back to local store data
      if (storeDocuments && storeDocuments.length > 0) {
        console.log("Falling back to local store data");
        const uniqueStoreDocs = deduplicateDocuments(storeDocuments);
        setDocuments(uniqueStoreDocs);
        setError(null);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Unique values for filter dropdowns
  const uniqueDocumentNames = Array.from(
    new Set(documents.map((d) => d.documentName).filter(Boolean))
  ).sort();

  const uniqueCompanyNames = Array.from(
    new Set(documents.map((d) => d.companyName).filter(Boolean))
  ).sort();

  const uniqueConcernPersonNames = Array.from(
    new Set(documents.map((d) => d.concernPersonName).filter(Boolean))
  ).sort();

  const filteredData = documents
    .filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm
        ? (item.sn?.toLowerCase().includes(searchLower) ||
           item.documentName?.toLowerCase().includes(searchLower) ||
           item.documentType?.toLowerCase().includes(searchLower) ||
           item.companyName?.toLowerCase().includes(searchLower) ||
           item.concernPersonName?.toLowerCase().includes(searchLower) ||
           item.pName?.toLowerCase().includes(searchLower) ||
           item.category?.toLowerCase().includes(searchLower) ||
           item.concernPersonMobile?.toLowerCase().includes(searchLower) ||
           item.concernPersonDepartment?.toLowerCase().includes(searchLower) ||
           item.companyBranch?.toLowerCase().includes(searchLower))
        : true;

      const matchesCategory = filterCategory
        ? item.category === filterCategory
        : true;

      const matchesDocumentName = selectedDocumentName
        ? item.documentName === selectedDocumentName
        : true;

      const matchesCompanyName = selectedCompanyName
        ? item.companyName === selectedCompanyName
        : true;

      const matchesConcernPersonName = selectedConcernPersonName
        ? item.concernPersonName === selectedConcernPersonName
        : true;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesDocumentName &&
        matchesCompanyName &&
        matchesConcernPersonName
      );
    })
    .sort((a, b) => {
      const getSnNumber = (sn: string) => {
        if (!sn) return -1;
        const match = sn.match(/SN-(\d+)/i);
        return match ? parseInt(match[1], 10) : -1;
      };
      return getSnNumber(a.sn) - getSnNumber(b.sn);
    });


  // console.log("FILTERED DATA:", filteredData);  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map((d) => d.id)));
    }
  };

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Share Modal State - Updated to include batch documents
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareType, setShareType] = useState<
    "email" | "whatsapp" | "both" | null
  >(null);
  const [shareDoc, setShareDoc] = useState<{
    id: string;
    name: string;
    fileContent?: string;
    document?: DocumentItem;
    isBatch?: boolean;
    batchDocuments?: DocumentItem[];
  } | null>(null);

  // Delete Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (id: string) => {
    setEditingDocId(id);
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null); // Close modal immediately

    const doc = documents.find((d) => d.id === id);

    // Remove locally first for immediate feedback
    deleteDocument(id);
    setDocuments(documents.filter((d) => d.id !== id));
    if (selectedIds.has(id)) {
      const newSelected = new Set(selectedIds);
      newSelected.delete(id);
      setSelectedIds(newSelected);
    }

    if (doc && doc.id && !isNaN(Number(doc.id))) {
      try {
        toast.loading("Deleting from cloud...", { id: "delete-toast" });

        const { error } = await supabase
          .from('Add New Document')
          .update({ is_deleted: true })
          .eq('id', Number(doc.id));

        if (error) throw error;

        toast.success("Document deleted from cloud", { id: "delete-toast" });
      } catch (error) {
        console.error("Failed to delete from cloud", error);
        toast.error("Deleted locally, but cloud update failed.", {
          id: "delete-toast",
        });
      }
    } else {
      toast.success("Document deleted locally");
    }
  };

  // Updated openShare function with 7 days expiry

  const openShare = (
    type: "email" | "whatsapp" | "both",
    doc: {
      id: string;
      name: string;
      fileContent?: string;
      document?: DocumentItem;
      isBatch?: boolean;
      batchDocuments?: DocumentItem[];
    },
  ) => {
    setShareType(type);

    setShareDoc({
      ...doc,
      // Automatically set 7 days expiry for all shares
      document: doc.document ? {
        ...doc.document,
        sharedExpiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      } : doc.document
    });

    setIsShareModalOpen(true);
  };

  // Function to handle batch sharing with expiry
  const handleBatchShare = (type: "email" | "whatsapp") => {
    const selectedDocuments = filteredData.filter((d) => selectedIds.has(d.id));

    if (selectedDocuments.length === 0) {
      toast.error("No documents selected");
      return;
    }

    if (selectedDocuments.length === 1) {
      // Single document selected
      const doc = selectedDocuments[0];
      openShare(type, {
        id: doc.id,
        name: doc.documentName,
        fileContent: doc.fileContent,
        document: doc,
        isBatch: false,
      });
    } else {
      // Multiple documents selected - batch mode
      const docsWithExpiry = selectedDocuments.map(doc => ({
        ...doc,
        sharedExpiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }));

      openShare(type, {
        id: "batch",
        name: `${selectedIds.size} Documents`,
        isBatch: true,
        batchDocuments: docsWithExpiry,
        // Include first document for reference
        document: docsWithExpiry[0],
        fileContent: docsWithExpiry[0]?.fileContent,
      });
    }
  };

  const handleDownload = (fileContent: string | undefined) => {
    if (!fileContent) {
      alert("File content not available for download.");
      return;
    }

    let fileUrl = fileContent;

    // Convert Google Drive view/edit URLs to direct view URLs
    if (fileUrl.includes("drive.google.com")) {
      let fileId = null;

      const viewMatch = fileUrl.match(/\/file\/d\/([^/]+)/);
      if (viewMatch) {
        fileId = viewMatch[1];
      }

      const openMatch = fileUrl.match(/[?&]id=([^&]+)/);
      if (openMatch) {
        fileId = openMatch[1];
      }

      if (fileId) {
        fileUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }

    if (fileUrl.startsWith("data:")) {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    window.open(fileUrl, "_blank");
  };

  const handleAddModalClose = () => {
    setIsAddModalOpen(false);
    loadDocuments();
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    loadDocuments();
  };

  return (
    <>
      <div className="space-y-3">
        {/* Search and Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-xl shadow-input">
          <div className="min-h-[38px] flex items-center">
            {selectedIds.size > 0 ? (
              <div className="flex flex-wrap items-center gap-3 animate-fade-in-right w-full sm:w-auto">
                <span className="text-sm text-indigo-600 font-semibold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 whitespace-nowrap">
                  {selectedIds.size} Selected
                </span>
                <div className="hidden sm:block h-4 w-px bg-gray-200 mx-1"></div>
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <button
                    onClick={() => handleBatchShare("email")}
                    className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                    title="Share via Email"
                  >
                    <Mail size={14} />
                    Email {selectedIds.size > 1 && `(${selectedIds.size})`}
                  </button>
                  <button
                    onClick={() => handleBatchShare("whatsapp")}
                    className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-100"
                    title="Share via WhatsApp"
                  >
                    <MessageCircle size={14} />
                    WhatsApp {selectedIds.size > 1 && `(${selectedIds.size})`}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  All Documents
                </h1>
                <p className="text-gray-500 text-xs mt-1">
                  Manage your documents repository
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search All documents..."
                className="pl-10 pr-4 py-2.5 w-full shadow-input border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              <span>Add New</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="bg-white p-4 rounded-xl shadow-input space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Document Name
              </label>
              <select
                value={selectedDocumentName}
                onChange={(e) => setSelectedDocumentName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="">All Document Names</option>
                {uniqueDocumentNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Company Name
              </label>
              <select
                value={selectedCompanyName}
                onChange={(e) => setSelectedCompanyName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="">All Companies</option>
                {uniqueCompanyNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Concern Person Name
              </label>
              <select
                value={selectedConcernPersonName}
                onChange={(e) => setSelectedConcernPersonName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="">All Concern Persons</option>
                {uniqueConcernPersonNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(selectedDocumentName || selectedCompanyName || selectedConcernPersonName || searchTerm) && (
            <div className="flex justify-end pt-1">
              <button
                onClick={() => {
                  setSelectedDocumentName("");
                  setSelectedCompanyName("");
                  setSelectedConcernPersonName("");
                  setSearchTerm("");
                }}
                className="text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12 bg-white rounded-xl shadow-input">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="text-gray-500 text-sm">Loading documents...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading documents
                </h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={loadDocuments}
                  className="mt-3 text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Table View */}
        {!isLoading && !error && (
          <div className="hidden md:flex flex-col bg-white rounded-xl shadow-input h-[calc(100vh-200px)]">
            {/* Scroll container — both axes */}
            <div className="overflow-x-auto overflow-y-auto h-[320px]">
              <table className="min-w-max w-full text-center border-collapse">
                <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm text-nowrap">
                  <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                    <th className="px-3 py-2 w-10 text-center bg-gray-50">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        checked={
                          filteredData.length > 0 &&
                          selectedIds.size === filteredData.length
                        }
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="px-3 py-2 w-12 text-center bg-gray-50">
                      Share
                    </th>
                    <th className="px-3 py-2 w-20 text-center bg-gray-50">
                      Action
                    </th>
                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50 text-center">
                      Serial No
                    </th>
                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50 text-center">
                      File
                    </th>
                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50 text-center">
                      File Size
                    </th>
                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50 text-center">
                      Document Name
                    </th>
                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50 text-center">
                      Document Type
                    </th>
                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50 text-center">
                      Company Name
                    </th>
                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50 text-center">
                      Concern Person Name
                    </th>
                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50 text-center">
                      Name
                    </th>
                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50 text-center">
                      Category
                    </th>

                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50 text-center">
                      Issue Date
                    </th>
                    <th className="px-3 py-2 whitespace-nowrap text-center bg-gray-50">
                      Renewal
                    </th>
                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50 text-center">
                      Renewal Date
                    </th>


                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50 text-center">
                      Concern Mobile Number
                    </th>
                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50 text-center">
                      Issued by
                    </th>

                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50 text-center">
                  {filteredData.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50/80 transition-colors ${selectedIds.has(item.id) ? "bg-indigo-50/30" : ""
                        }`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelection(item.id)}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors outline-none">
                              <MoreHorizontal size={20} />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              className="min-w-[160px] bg-white rounded-lg shadow-xl border border-gray-100 p-1.5 z-50 animate-fade-in-up"
                              sideOffset={5}
                              align="start"
                            >
                              <DropdownMenu.Item
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-md cursor-pointer outline-none"
                                onClick={() =>
                                  openShare("email", {
                                    id: item.id,
                                    name: item.documentName,
                                    fileContent: item.fileContent,
                                    document: item,
                                    isBatch: false,
                                  })
                                }
                              >
                                <Mail size={16} className="text-blue-500" />
                                Email
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-md cursor-pointer outline-none"
                                onClick={() =>
                                  openShare("whatsapp", {
                                    id: item.id,
                                    name: item.documentName,
                                    fileContent: item.fileContent,
                                    document: item,
                                    isBatch: false,
                                  })
                                }
                              >
                                <MessageCircle
                                  size={16}
                                  className="text-green-500"
                                />
                                WhatsApp
                              </DropdownMenu.Item>
                              <DropdownMenu.Separator className="h-px bg-gray-100 my-1" />
                              <DropdownMenu.Item
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-md cursor-pointer outline-none"
                                onClick={() =>
                                  openShare("both", {
                                    id: item.id,
                                    name: item.documentName,
                                    fileContent: item.fileContent,
                                    document: item,
                                    isBatch: false,
                                  })
                                }
                              >
                                <Share2 size={16} className="text-purple-500" />
                                Share Both
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => handleEdit(item.id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-bold text-gray-700 text-xs text-center">
                        {item.sn}
                      </td>
                      <td className="px-3 py-2">
                        {item.file ? (
                          <div
                            onClick={() => handleDownload(item.fileContent)}
                            className="flex items-center justify-center gap-2 text-indigo-600 text-xs cursor-pointer hover:underline"
                          >
                            <Download size={14} />
                            <span className="truncate max-w-[100px]">View</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-700 text-xs text-center">
                        {item.file ? (fileSizes[item.id] || "Loading...") : "-"}
                      </td>
                      <td className="px-3 py-2 text-gray-900">
                        <div className="flex items-center justify-center gap-2">
                          {item.documentName}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-center">
                        {item.documentType}
                      </td>
                      <td className="px-3 py-2 text-gray-700 text-center">
                        {item.companyName || "-"}
                      </td>
                      <td className="px-3 py-2 text-gray-700 text-center">
                        {item.concernPersonName || "-"}
                      </td>

                      <td className="px-3 py-2 font-medium text-gray-900 text-center">
                        {item.pName || "-"}
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-center">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700 font-mono text-xs text-center text-nowrap">
                        {formatDate(item.issueDate)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {item.needsRenewal ? (
                          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded text-xs font-medium">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-gray-50 text-gray-500 border border-gray-100 rounded text-xs font-medium">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500 font-mono text-xs text-center">
                        {formatDate(item.renewalDate)}
                      </td>


                      <td className="px-3 py-2 text-gray-700 text-center">
                        {item.concernPersonMobile || "-"}
                      </td>
                      <td className="px-3 py-2 text-gray-700 text-center">
                        {item.concernPersonDepartment || "-"}
                      </td>

                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr>
                      <td
                        colSpan={17}
                        className="p-12 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <FileText size={48} className="text-gray-200" />
                          <p>No documents found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mobile Card View */}
        {!isLoading && !error && (
          <div className="md:hidden grid sm:grid-cols-2 gap-4">
            {filteredData.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-xl shadow-input space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                      {item.sn}
                    </span>
                    <h3 className="font-semibold text-gray-900 mt-1">
                      {item.companyName || "-"}
                    </h3>
                    <p className="text-xs text-gray-500">{item.documentType}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Company: {item.companyBranch || "-"}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-medium border border-indigo-100">
                    {item.category}
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-50">
                  <div className="flex items-start gap-2 mb-2">
                    <FileText
                      size={16}
                      className="text-gray-400 mt-0.5 max-w-4"
                    />
                    <span className="text-sm text-gray-700 font-medium line-clamp-2">
                      {item.documentName}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Renewal:</span>
                      {item.needsRenewal ? (
                        <span className="text-amber-600 font-medium bg-amber-50 px-1.5 rounded">
                          Yes
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium bg-gray-50 px-1.5 rounded">
                          No
                        </span>
                      )}
                    </div>
                    {item.needsRenewal && (
                      <span className="font-mono text-red-500 bg-red-50 px-1.5 rounded">
                        {formatDate(item.renewalDate)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <div>
                      <span className="text-gray-400 block">Issue Date:</span>
                      {formatDate(item.issueDate)}
                    </div>
                    <div>
                      <span className="text-gray-400 block">Concern Name:</span>
                      {item.concernPersonName || "-"}
                    </div>
                    <div>
                      <span className="text-gray-400 block">Mobile:</span>
                      {item.concernPersonMobile || "-"}
                    </div>
                    <div>
                      <span className="text-gray-400 block">Dept:</span>
                      {item.concernPersonDepartment || "-"}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-gray-50 flex justify-between items-center bg-gray-50/50 -mx-4 -mb-4 px-4 py-3">
                    {item.file ? (
                      <button
                        onClick={() => handleDownload(item.fileContent)}
                        className="flex items-center gap-1.5 text-indigo-600 text-xs font-medium"
                      >
                        <Download size={14} />
                        Download
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                    <div className="flex gap-2">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className="p-1.5 text-indigo-600 bg-indigo-50 rounded-lg">
                            <Share2 size={14} />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="min-w-[160px] bg-white rounded-lg shadow-xl border border-gray-100 p-1.5 z-50 animate-fade-in-up"
                            sideOffset={5}
                            align="end"
                          >
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-md cursor-pointer outline-none"
                              onClick={() =>
                                openShare("email", {
                                  id: item.id,
                                  name: item.documentName,
                                  fileContent: item.fileContent,
                                  document: item,
                                  isBatch: false,
                                })
                              }
                            >
                              <Mail size={16} className="text-blue-500" />
                              Email
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-md cursor-pointer outline-none"
                              onClick={() =>
                                openShare("whatsapp", {
                                  id: item.id,
                                  name: item.documentName,
                                  fileContent: item.fileContent,
                                  document: item,
                                  isBatch: false,
                                })
                              }
                            >
                              <MessageCircle
                                size={16}
                                className="text-green-500"
                              />
                              WhatsApp
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator className="h-px bg-gray-100 my-1" />
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-md cursor-pointer outline-none"
                              onClick={() =>
                                openShare("both", {
                                  id: item.id,
                                  name: item.documentName,
                                  fileContent: item.fileContent,
                                  document: item,
                                  isBatch: false,
                                })
                              }
                            >
                              <Share2 size={16} className="text-purple-500" />
                              Share Both
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>

                      <button
                        onClick={() => handleEdit(item.id)}
                        className="p-1.5 text-blue-600 bg-blue-50 rounded-lg"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-red-600 bg-red-50 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredData.length === 0 && (
              <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100 border-dashed">
                <div className="flex flex-col items-center gap-2">
                  <FileText size={40} className="text-gray-200" />
                  <p>No documents found</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <AddDocument isOpen={isAddModalOpen} onClose={handleAddModalClose} />
      <EditDocument
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        documentId={editingDocId}
      />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        type={shareType}
        documentId={shareDoc?.id || ""}
        documentName={shareDoc?.name || ""}
        fileContent={shareDoc?.fileContent}
        document={shareDoc?.document}
        isBatch={shareDoc?.isBatch}
        batchDocuments={shareDoc?.batchDocuments}
      />

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100 opacity-100">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Delete Document?
              </h3>
              <p className="text-gray-500 mb-6">
                Are you sure you want to delete this document? This action
                cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AllDocuments;