import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Calendar, 
  Building,
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Share2, 
  FileSpreadsheet, 
  Shield, 
  CreditCard, 
  User, 
  ChevronDown, 
  X, 
  TrendingUp, 
  Filter, 
  Layers, 
  AlertTriangle, 
  Printer, 
  ArrowUpDown, 
  Check, 
  SlidersHorizontal,
  FolderOpen,
  Briefcase,
  FileCheck,
  Award
} from 'lucide-react';
import supabase from '../utils/supabase';
import useHeaderStore from '../store/headerStore';
import { formatDate } from '../utils/dateFormatter';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

// Helper to safely execute Supabase queries and avoid breaking on missing tables (404)
const safeQuery = async (queryPromise: any) => {
  try {
    const res = await queryPromise;
    if (res.error) return { data: [] };
    return res;
  } catch (e) {
    return { data: [] };
  }
};

// Interfaces
interface DashboardItem {
  id: string;
  sn: string;
  module: 'document' | 'subscription' | 'insurance' | 'bg' | 'work_order' | 'tender' | 'test_report' | 'experience' | 'loan';
  subType: string;
  name: string;
  category: string;
  status: 'Active' | 'Expired' | 'Expiring Soon' | 'Pending Renewal';
  expiryDate: string | null;
  premium: number;
  shareCount: number;
  renewalCount: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  renewalStatus: 'Renewal Required' | 'Renewal Completed' | 'No Renewal Required';
  shareStatus: 'Shared' | 'Not Shared' | 'Most Shared';
  created_at: string;
  need_renewal: boolean;
}

interface SummaryData {
  companyName: string;
  generatedAt: string;
  generatedBy: string;
  reportTypeLabel: string;
  dateRangeLabel: string;

  // KPI Dashboard Cards
  totalRecords: number;
  totalDocs: number;
  totalSubs: number;
  totalInsurance: number;
  totalBgs: number;
  totalWorkOrders: number;
  totalTenders: number;
  totalTestReports: number;
  totalExperience: number;
  totalLoans: number;
  activeRecords: number;
  expiredRecords: number;
  expiringSoon: number;
  pendingRenewals: number;
  totalShares: number;
  totalRenewals: number;

  // Executive Insights
  highestRiskCategory: string;
  mostSharedDoc: string;
  mostSharedCount: number;
  mostRenewedItem: string;
  mostRenewedCount: number;
  complianceStatus: number;

  // Renewal Forecast
  forecast7Days: number;
  forecast30Days: number;
  forecast60Days: number;
  forecast90Days: number;

  // Lists & Tables
  criticalAlerts: Array<{ id: string; type: 'expired' | 'expiring_soon' | 'warning'; message: string; date?: string }>;
  topRiskItems: Array<{ name: string; category: string; expiryDate: string | null; riskLevel: 'Critical' | 'High' | 'Medium' | 'Low' }>;
  documents: Array<DashboardItem>;
  subscriptions: Array<DashboardItem>;
  insurance: Array<DashboardItem>;
  bgs: Array<DashboardItem>;
  workOrders: Array<DashboardItem>;
  tenders: Array<DashboardItem>;
  testReports: Array<DashboardItem>;
  experience: Array<DashboardItem>;
  loans: Array<DashboardItem>;
  recentActivities: Array<{ id: string; date: string; type: string; message: string }>;

  // status matrix details
  docsActive: number;
  docsExpired: number;
  docsPendingRenewal: number;
  subsActive: number;
  subsExpired: number;
  subsPendingRenewal: number;
  insActive: number;
  insExpired: number;
  insPendingRenewal: number;
  bgsActive: number;
  bgsExpired: number;
  bgsPendingRenewal: number;
  woActive: number;
  woExpired: number;
  tndActive: number;
  tndExpired: number;
  trActive: number;
  trExpired: number;
  expActive: number;
  expExpired: number;
  loanActive: number;
  loanExpired: number;
}

const MODULE_OPTIONS = [
  { value: 'all', label: 'All Modules / All Pages' },
  { value: 'documents', label: 'Documents' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'bg', label: 'Bank Guarantees (BG)' },
  { value: 'propertytax', label: 'Property Tax' },
  { value: 'emailrenewal', label: 'Email Renewal' },
  { value: 'insurance', label: 'Insurance (All Categories)' },
  { value: 'vehicleinsurance', label: 'Vehicle Insurance' },
  { value: 'healthinsurance', label: 'Health Insurance' },
  { value: 'lifeinsurance', label: 'Life Insurance' },
  { value: 'building', label: 'Building Insurance' },
  { value: 'workman', label: "Employee's Compensation" },
  { value: 'companystaff', label: 'Company Staff Insurance' },
  { value: 'construction', label: 'Construction Insurance' },
  { value: 'akashdeepcomplex', label: 'Akashdeep Complex Insurance' },
  { value: 'firepolicy', label: 'Fire Policy Insurance' },
  { value: 'work_orders', label: 'Work Orders' },
  { value: 'tenders', label: 'Tenders' },
  { value: 'test_reports', label: 'Test Reports (All Categories)' },
  { value: 'hls', label: 'HLS Test Report' },
  { value: 'pump', label: 'Pump Test Report' },
  { value: 'pannel', label: 'Panel Test Report' },
  { value: 'pv_module', label: 'PV Module Test Report' },
  { value: 'pv_water_pumping', label: 'PV Water Pumping Test Report' },
  { value: 'solar_photovoltaic', label: 'Solar Photovoltaic Test Report' },
  { value: 'experience', label: 'Experience Certificates (All)' },
  { value: 'pump_exp', label: 'Pump Experience Certificate' },
  { value: 'loan', label: 'Loans' },
];

const Summary = () => {
  const { setTitle } = useHeaderStore();
  const reportRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moduleDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Raw fetched lists (cached per company to avoid duplicate API requests)
  const [cachedCompany, setCachedCompany] = useState('');
  const [rawDocs, setRawDocs] = useState<any[]>([]);
  const [rawSubs, setRawSubs] = useState<any[]>([]);
  const [rawVeh, setRawVeh] = useState<any[]>([]);
  const [rawHealth, setRawHealth] = useState<any[]>([]);
  const [rawLife, setRawLife] = useState<any[]>([]);
  const [rawFire, setRawFire] = useState<any[]>([]);
  const [rawEmp, setRawEmp] = useState<any[]>([]);
  const [rawBgs, setRawBgs] = useState<any[]>([]);
  const [rawWorkOrders, setRawWorkOrders] = useState<any[]>([]);
  const [rawTenders, setRawTenders] = useState<any[]>([]);
  const [rawSpvTR, setRawSpvTR] = useState<any[]>([]);
  const [rawPvWaterTR, setRawPvWaterTR] = useState<any[]>([]);
  const [rawPvModTR, setRawPvModTR] = useState<any[]>([]);
  const [rawPumpTR, setRawPumpTR] = useState<any[]>([]);
  const [rawPannelTR, setRawPannelTR] = useState<any[]>([]);
  const [rawHlsTR, setRawHlsTR] = useState<any[]>([]);
  const [rawExpCerts, setRawExpCerts] = useState<any[]>([]);
  const [rawLoans, setRawLoans] = useState<any[]>([]);
  const [rawShares, setRawShares] = useState<any[]>([]);
  const [rawDocRenewals, setRawDocRenewals] = useState<any[]>([]);
  const [rawSubRenewals, setRawSubRenewals] = useState<any[]>([]);
  const [rawVehRenewals, setRawVehRenewals] = useState<any[]>([]);
  const [rawHealthRenewals, setRawHealthRenewals] = useState<any[]>([]);
  const [rawLifeRenewals, setRawLifeRenewals] = useState<any[]>([]);

  // 11 Filter States
  const [companies, setCompanies] = useState<string[]>([]);
  const [moduleCompaniesMap, setModuleCompaniesMap] = useState<Record<string, string[]>>({});
  const [selectedCompany, setSelectedCompany] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');

  const [moduleFilter, setModuleFilter] = useState('all');
  const [isModuleDropdownOpen, setIsModuleDropdownOpen] = useState(false);
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [renewalFilter, setRenewalFilter] = useState('all');
  const [shareFilter, setShareFilter] = useState('all');
  const [textSearch, setTextSearch] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [expiryBucket, setExpiryBucket] = useState('all');

  // UI status states
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<SummaryData | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

  const filteredModuleOptions = MODULE_OPTIONS.filter((opt) =>
    opt.label.toLowerCase().includes(moduleSearchQuery.toLowerCase())
  );

  const filteredCategoryOptions = availableCategories.filter((cat) =>
    cat.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  useEffect(() => {
    setTitle('Executive MIS Summary');
    loadCompanyList();
  }, [setTitle]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
      if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(event.target as Node)) {
        setIsModuleDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unique company names dynamically from all tables
  const loadCompanyList = async () => {
    try {
      setIsLoading(true);
      const [
        docsRes, subsRes, vehRes, healthRes, lifeRes, fireRes, empRes, bgRes,
        woRes, tndRes, spvRes, pvWaterRes, pvModRes, pumpRes, pannelRes, hlsRes, expRes, loanRes, masterRes
      ] = await Promise.all([
        safeQuery(supabase.from('Add New Document').select('company_name, category').eq('is_deleted', false)),
        safeQuery(supabase.from('create_subscription').select('company_name')),
        safeQuery(supabase.from('vehicle_insurance').select('company_name')),
        safeQuery(supabase.from('health_insurance').select('company_name')),
        safeQuery(supabase.from('life_insurance').select('company_name')),
        safeQuery(supabase.from('fire_policy').select('company_name')),
        safeQuery(supabase.from('employee_compensation').select('company_name')),
        safeQuery(supabase.from('BG').select('bg_name')),
        safeQuery(supabase.from('work_orders').select('company_name')),
        safeQuery(supabase.from('tenders').select('firm_name')),
        safeQuery(supabase.from('solar_photovoltaic_test_reports').select('company_name')),
        safeQuery(supabase.from('pv_water_pumping_test_reports').select('company_name')),
        safeQuery(supabase.from('pv_module_test_reports').select('company_name')),
        safeQuery(supabase.from('pump_test_reports').select('company_name')),
        safeQuery(supabase.from('pannel_test_reports').select('company_name')),
        safeQuery(supabase.from('hls_test_reports').select('company_name')),
        safeQuery(supabase.from('pump_experience_certificates').select('company_name')),
        safeQuery(supabase.from('loan').select('company_name')),
        safeQuery(supabase.from('master').select('company_name')),
      ]);

      const extractNames = (data: any[] | null, key: string = 'company_name'): Set<string> => {
        const set = new Set<string>();
        if (!data) return set;
        data.forEach(item => {
          if (item[key] && typeof item[key] === 'string' && item[key].trim()) {
            set.add(item[key].trim());
          }
        });
        return set;
      };

      const docsCompanies = extractNames(docsRes.data, 'company_name');
      const docsCategories = extractNames(docsRes.data, 'category');
      const subsCompanies = extractNames(subsRes.data, 'company_name');
      const vehCompanies = extractNames(vehRes.data, 'company_name');
      const healthCompanies = extractNames(healthRes.data, 'company_name');
      const lifeCompanies = extractNames(lifeRes.data, 'company_name');
      const fireCompanies = extractNames(fireRes.data, 'company_name');
      const empCompanies = extractNames(empRes.data, 'company_name');
      const bgCompanies = extractNames(bgRes.data, 'bg_name');
      const woCompanies = extractNames(woRes.data, 'company_name');
      const tndCompanies = extractNames(tndRes.data, 'firm_name');
      const spvCompanies = extractNames(spvRes.data, 'company_name');
      const pvWaterCompanies = extractNames(pvWaterRes.data, 'company_name');
      const pvModCompanies = extractNames(pvModRes.data, 'company_name');
      const pumpCompanies = extractNames(pumpRes.data, 'company_name');
      const pannelCompanies = extractNames(pannelRes.data, 'company_name');
      const hlsCompanies = extractNames(hlsRes.data, 'company_name');
      const expCompanies = extractNames(expRes.data, 'company_name');
      const loanCompanies = extractNames(loanRes.data, 'company_name');
      const masterCompanies = extractNames(masterRes.data, 'company_name');

      const allSet = new Set<string>([
        ...docsCompanies, ...subsCompanies, ...vehCompanies, ...healthCompanies, ...lifeCompanies,
        ...fireCompanies, ...empCompanies, ...bgCompanies, ...woCompanies, ...tndCompanies,
        ...spvCompanies, ...pvWaterCompanies, ...pvModCompanies, ...pumpCompanies, ...pannelCompanies,
        ...hlsCompanies, ...expCompanies, ...loanCompanies, ...masterCompanies
      ]);

      const insSet = new Set<string>([
        ...vehCompanies, ...healthCompanies, ...lifeCompanies, ...fireCompanies, ...empCompanies
      ]);

      const trSet = new Set<string>([
        ...spvCompanies, ...pvWaterCompanies, ...pvModCompanies, ...pumpCompanies, ...pannelCompanies, ...hlsCompanies
      ]);

      const map: Record<string, string[]> = {
        all: Array.from(allSet).sort(),
        documents: Array.from(docsCompanies).sort(),
        subscriptions: Array.from(subsCompanies).sort(),
        bg: Array.from(bgCompanies).sort(),
        insurance: Array.from(insSet).sort(),
        vehicleinsurance: Array.from(vehCompanies).sort(),
        healthinsurance: Array.from(healthCompanies).sort(),
        lifeinsurance: Array.from(lifeCompanies).sort(),
        building: Array.from(fireCompanies).sort(),
        workman: Array.from(empCompanies).sort(),
        companystaff: Array.from(healthCompanies).sort(),
        construction: Array.from(fireCompanies).sort(),
        akashdeepcomplex: Array.from(fireCompanies).sort(),
        firepolicy: Array.from(fireCompanies).sort(),
        work_orders: Array.from(woCompanies).sort(),
        tenders: Array.from(tndCompanies).sort(),
        test_reports: Array.from(trSet).sort(),
        hls: Array.from(hlsCompanies).sort(),
        pump: Array.from(pumpCompanies).sort(),
        pannel: Array.from(pannelCompanies).sort(),
        pv_module: Array.from(pvModCompanies).sort(),
        pv_water_pumping: Array.from(pvWaterCompanies).sort(),
        solar_photovoltaic: Array.from(spvCompanies).sort(),
        experience: Array.from(expCompanies).sort(),
        pump_exp: Array.from(expCompanies).sort(),
        loan: Array.from(loanCompanies).sort(),
      };

      setCompanies(Array.from(allSet).sort());
      setModuleCompaniesMap(map);
      if (docsCategories.size > 0) {
        setAvailableCategories(Array.from(docsCategories).sort());
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load company list');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedCompany) count++;
    if (dateRange !== 'all') count++;
    if (moduleFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (priorityFilter !== 'all') count++;
    if (renewalFilter !== 'all') count++;
    if (shareFilter !== 'all') count++;
    if (textSearch.trim()) count++;
    if (sortBy !== 'latest') count++;
    if (expiryBucket !== 'all') count++;
    return count;
  };

  const handleResetFilters = () => {
    setSelectedCompany('');
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setModuleFilter('all');
    setCategoryFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setRenewalFilter('all');
    setShareFilter('all');
    setTextSearch('');
    setSortBy('latest');
    setExpiryBucket('all');
    setReportData(null);
    setLastGeneratedAt(null);
    toast.success('Filters reset successfully');
  };

  // Main Report Generation Logic
  const handleGenerateReport = async () => {
    if (!selectedCompany) {
      toast.error('Please select a company first');
      return;
    }

    try {
      setIsGenerating(true);

      // 1. Fetch raw data if it is a new company, else reuse cached values to satisfy performance constraints
      let dDocs = rawDocs, dSubs = rawSubs, dVeh = rawVeh, dHealth = rawHealth, dLife = rawLife, dFire = rawFire, dEmp = rawEmp, dBgs = rawBgs;
      let dShares = rawShares, dDocRen = rawDocRenewals, dSubRen = rawSubRenewals, dVehRen = rawVehRenewals, dHealthRen = rawHealthRenewals, dLifeRen = rawLifeRenewals;
      let dWorkOrders = rawWorkOrders, dTenders = rawTenders, dSpvTR = rawSpvTR, dPvWaterTR = rawPvWaterTR, dPvModTR = rawPvModTR, dPumpTR = rawPumpTR, dPannelTR = rawPannelTR, dHlsTR = rawHlsTR, dExpCerts = rawExpCerts, dLoans = rawLoans;

      if (cachedCompany !== selectedCompany) {
        const [
          docsRes, subsRes, vehRes, healthRes, lifeRes, fireRes, empRes, bgRes,
          sharesRes, docRenRes, subRenRes, vehRenRes, healthRenRes, lifeRenRes,
          woRes, tndRes, spvRes, pvWaterRes, pvModRes, pumpRes, pannelRes, hlsRes, expRes, loanRes
        ] = await Promise.all([
          safeQuery(supabase.from('Add New Document').select('*').eq('company_name', selectedCompany).eq('is_deleted', false)),
          safeQuery(supabase.from('create_subscription').select('*').eq('company_name', selectedCompany)),
          safeQuery(supabase.from('vehicle_insurance').select('*').eq('company_name', selectedCompany)),
          safeQuery(supabase.from('health_insurance').select('*').eq('company_name', selectedCompany)),
          safeQuery(supabase.from('life_insurance').select('*').eq('company_name', selectedCompany)),
          safeQuery(supabase.from('fire_policy').select('*').eq('company_name', selectedCompany)),
          safeQuery(supabase.from('employee_compensation').select('*').eq('company_name', selectedCompany)),
          safeQuery(supabase.from('BG').select('*')),
          safeQuery(supabase.from('Shared_Documents').select('*')),
          safeQuery(supabase.from('Document Renewal').select('*')),
          safeQuery(supabase.from('RENEWAL').select('*')),
          safeQuery(supabase.from('vehicle_insurance_renewal').select('*')),
          safeQuery(supabase.from('health_insurance_renewal').select('*')),
          safeQuery(supabase.from('life_insurance_renewal').select('*')),
          safeQuery(supabase.from('work_orders').select('*').eq('company_name', selectedCompany)),
          safeQuery(supabase.from('tenders').select('*').eq('firm_name', selectedCompany)),
          safeQuery(supabase.from('solar_photovoltaic_test_reports').select('*').eq('company_name', selectedCompany)),
          safeQuery(supabase.from('pv_water_pumping_test_reports').select('*').eq('company_name', selectedCompany)),
          safeQuery(supabase.from('pv_module_test_reports').select('*').eq('company_name', selectedCompany)),
          safeQuery(supabase.from('pump_test_reports').select('*').eq('company_name', selectedCompany)),
          safeQuery(supabase.from('pannel_test_reports').select('*').eq('company_name', selectedCompany)),
          safeQuery(supabase.from('hls_test_reports').select('*').eq('company_name', selectedCompany)),
          safeQuery(supabase.from('pump_experience_certificates').select('*').eq('company_name', selectedCompany)),
          safeQuery(supabase.from('loan').select('*').eq('company_name', selectedCompany)),
        ]);

        dDocs = docsRes.data || [];
        dSubs = subsRes.data || [];
        dVeh = vehRes.data || [];
        dHealth = healthRes.data || [];
        dLife = lifeRes.data || [];
        dFire = fireRes.data || [];
        dEmp = empRes.data || [];
        dBgs = (bgRes.data || []).filter(b => (b.bg_name || '').trim().toLowerCase() === selectedCompany.trim().toLowerCase());
        dShares = sharesRes.data || [];
        dDocRen = docRenRes.data || [];
        dSubRen = subRenRes.data || [];
        dVehRen = vehRenRes.data || [];
        dHealthRen = healthRenRes.data || [];
        dLifeRen = lifeRenRes.data || [];
        dWorkOrders = woRes.data || [];
        dTenders = tndRes.data || [];
        dSpvTR = spvRes.data || [];
        dPvWaterTR = pvWaterRes.data || [];
        dPvModTR = pvModRes.data || [];
        dPumpTR = pumpRes.data || [];
        dPannelTR = pannelRes.data || [];
        dHlsTR = hlsRes.data || [];
        dExpCerts = expRes.data || [];
        dLoans = loanRes.data || [];

        // Update caches
        setRawDocs(dDocs);
        setRawSubs(dSubs);
        setRawVeh(dVeh);
        setRawHealth(dHealth);
        setRawLife(dLife);
        setRawFire(dFire);
        setRawEmp(dEmp);
        setRawBgs(dBgs);
        setRawShares(dShares);
        setRawDocRenewals(dDocRen);
        setRawSubRenewals(dSubRen);
        setRawVehRenewals(dVehRen);
        setRawHealthRenewals(dHealthRen);
        setRawLifeRenewals(dLifeRen);
        setRawWorkOrders(dWorkOrders);
        setRawTenders(dTenders);
        setRawSpvTR(dSpvTR);
        setRawPvWaterTR(dPvWaterTR);
        setRawPvModTR(dPvModTR);
        setRawPumpTR(dPumpTR);
        setRawPannelTR(dPannelTR);
        setRawHlsTR(dHlsTR);
        setRawExpCerts(dExpCerts);
        setRawLoans(dLoans);
        setCachedCompany(selectedCompany);
      }

      const today = new Date();
      
      // Calculate Date Boundaries
      let startDateObj: Date | null = null;
      let endDateObj: Date | null = null;
      if (dateRange === 'today') {
        startDateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        endDateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      } else if (dateRange === 'yesterday') {
        startDateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        endDateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 23, 59, 59);
      } else if (dateRange === '7days') {
        startDateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        endDateObj = today;
      } else if (dateRange === '30days') {
        startDateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
        endDateObj = today;
      } else if (dateRange === 'month') {
        startDateObj = new Date(today.getFullYear(), today.getMonth(), 1);
        endDateObj = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      } else if (dateRange === 'lastmonth') {
        startDateObj = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDateObj = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
      } else if (dateRange === 'quarter') {
        const q = Math.floor(today.getMonth() / 3);
        startDateObj = new Date(today.getFullYear(), q * 3, 1);
        endDateObj = new Date(today.getFullYear(), (q + 1) * 3, 0, 23, 59, 59);
      } else if (dateRange === 'year') {
        startDateObj = new Date(today.getFullYear(), 0, 1);
        endDateObj = new Date(today.getFullYear(), 11, 31, 23, 59, 59);
      } else if (dateRange === 'custom') {
        if (customStartDate) startDateObj = new Date(customStartDate);
        if (customEndDate) endDateObj = new Date(customEndDate);
      }

      // Check dates safety helper
      const isDateInRange = (dStr: string | null | undefined) => {
        if (!dStr) return false;
        const dObj = new Date(dStr);
        if (isNaN(dObj.getTime())) return false;
        if (startDateObj && dObj < startDateObj) return false;
        if (endDateObj && dObj > endDateObj) return false;
        return true;
      };

      const docSerials = new Set(dDocs.map(d => d.serial_no).filter(Boolean));
      const subSerials = new Set(dSubs.map(s => s.serial_no).filter(Boolean));
      const insSerials = new Set([
        ...dVeh.map(v => v.serial_no),
        ...dHealth.map(h => h.serial_no),
        ...dLife.map(l => l.serial_no),
        ...dFire.map(f => f.serial_no),
        ...dEmp.map(e => e.serial_no)
      ].filter(Boolean));

      // Calculate stats map
      const docShareMap = new Map<string, number>();
      const docShareDetails = dShares.filter(s => docSerials.has(s.serial_no) || insSerials.has(s.serial_no));
      docShareDetails.forEach(s => {
        const sn = s.serial_no || '';
        docShareMap.set(sn, (docShareMap.get(sn) || 0) + 1);
      });

      const getRenewalCount = (sn: string, mod: string) => {
        if (mod === 'document') return dDocRen.filter(r => r.serial_no === sn).length;
        if (mod === 'subscription') return dSubRen.filter(r => r.subscription_no === sn).length;
        if (mod === 'vehicle') return dVehRen.filter(r => r.serial_no === sn).length;
        if (mod === 'health') return dHealthRen.filter(r => r.serial_no === sn).length;
        if (mod === 'life') return dLifeRen.filter(r => r.serial_no === sn).length;
        return 0;
      };

      // Gather & Standardize All Records
      const allUnifiedItems: DashboardItem[] = [];

      // Add Documents
      dDocs.forEach(d => {
        const hasExpiry = d.need_renewal && d.renewal_date;
        const expDate = hasExpiry ? new Date(d.renewal_date) : null;
        const isExpired = expDate ? expDate < today : false;
        const isExpiringSoon = expDate ? (expDate >= today && expDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) : false;
        const statusVal = isExpired ? 'Expired' : (isExpiringSoon ? 'Expiring Soon' : 'Active');

        // Priority calculation
        let priorityVal: DashboardItem['priority'] = 'Low';
        if (isExpired) priorityVal = 'Critical';
        else if (isExpiringSoon) priorityVal = 'High';

        // Share status
        const shares = docShareMap.get(d.serial_no) || 0;
        let shareStatusVal: DashboardItem['shareStatus'] = 'Not Shared';
        if (shares > 2) shareStatusVal = 'Most Shared';
        else if (shares > 0) shareStatusVal = 'Shared';

        // Renewal status
        const renCount = getRenewalCount(d.serial_no, 'document');
        const needRenewal = !!d.need_renewal;
        const renStatus: DashboardItem['renewalStatus'] = needRenewal ? (renCount > 0 ? 'Renewal Completed' : 'Renewal Required') : 'No Renewal Required';

        allUnifiedItems.push({
          id: `doc-${d.id}`,
          sn: d.serial_no || '',
          module: 'document',
          subType: 'Document',
          name: d.document_name || 'N/A',
          category: d.category || 'N/A',
          status: statusVal,
          expiryDate: d.renewal_date || null,
          premium: 0,
          shareCount: shares,
          renewalCount: renCount,
          priority: priorityVal,
          renewalStatus: renStatus,
          shareStatus: shareStatusVal,
          created_at: d.created_at || '',
          need_renewal: needRenewal
        });
      });

      // Add Subscriptions
      dSubs.forEach(s => {
        const expDate = s.end_date ? new Date(s.end_date) : null;
        const isExpired = expDate ? expDate < today : false;
        const isExpiringSoon = expDate ? (expDate >= today && expDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) : false;
        const statusVal = isExpired ? 'Expired' : (isExpiringSoon ? 'Expiring Soon' : 'Active');

        let priorityVal: DashboardItem['priority'] = 'Low';
        if (isExpired) priorityVal = 'Critical';
        else if (isExpiringSoon) priorityVal = 'High';

        const renCount = getRenewalCount(s.serial_no, 'subscription');
        const needRenewal = isExpired || isExpiringSoon;
        const renStatus: DashboardItem['renewalStatus'] = needRenewal ? (renCount > 0 ? 'Renewal Completed' : 'Renewal Required') : 'No Renewal Required';

        allUnifiedItems.push({
          id: `sub-${s.id}`,
          sn: s.serial_no || '',
          module: 'subscription',
          subType: 'Subscription',
          name: s.subscription_name || 'N/A',
          category: s.frequency || 'N/A',
          status: statusVal,
          expiryDate: s.end_date || null,
          premium: 0,
          shareCount: 0,
          renewalCount: renCount,
          priority: priorityVal,
          renewalStatus: renStatus,
          shareStatus: 'Not Shared',
          created_at: s.created_at || '',
          need_renewal: needRenewal
        });
      });

      // Add Insurances helper
      const addInsuranceToUnified = (list: any[], subTypeLabel: string, subTypeKey: string) => {
        list.forEach(i => {
          const expField = i.period_to || i.end_date || null;
          const expDate = expField ? new Date(expField) : null;
          const isExpired = expDate ? expDate < today : false;
          const isExpiringSoon = expDate ? (expDate >= today && expDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) : false;
          const statusVal = isExpired ? 'Expired' : (isExpiringSoon ? 'Expiring Soon' : 'Active');

          let priorityVal: DashboardItem['priority'] = 'Low';
          if (isExpired) priorityVal = 'Critical';
          else if (isExpiringSoon) priorityVal = 'High';

          const premiumVal = Number(i.premium_paid || i.final_premium_amt || 0);
          const renCount = getRenewalCount(i.serial_no, subTypeKey);
          const needRenewal = isExpired || isExpiringSoon;
          const renStatus: DashboardItem['renewalStatus'] = needRenewal ? (renCount > 0 ? 'Renewal Completed' : 'Renewal Required') : 'No Renewal Required';

          allUnifiedItems.push({
            id: `${subTypeKey}-${i.id}`,
            sn: i.serial_no || '',
            module: 'insurance',
            subType: subTypeLabel,
            name: i.policy_no || i.registration_no || 'N/A',
            category: subTypeLabel,
            status: statusVal,
            expiryDate: expField,
            premium: premiumVal,
            shareCount: docShareMap.get(i.serial_no) || 0,
            renewalCount: renCount,
            priority: priorityVal,
            renewalStatus: renStatus,
            shareStatus: (docShareMap.get(i.serial_no) || 0) > 0 ? 'Shared' : 'Not Shared',
            created_at: i.created_at || '',
            need_renewal: needRenewal
          });
        });
      };

      addInsuranceToUnified(dVeh, 'Vehicle Insurance', 'vehicle');
      addInsuranceToUnified(dHealth, 'Health Insurance', 'health');
      addInsuranceToUnified(dLife, 'Life Insurance', 'life');
      addInsuranceToUnified(dFire, 'Fire Policy', 'fire');
      addInsuranceToUnified(dEmp, 'Employee Compensation', 'compensation');

      // Add BGs
      dBgs.forEach(b => {
        const expDate = b.expiry_date ? new Date(b.expiry_date) : null;
        const isExpired = expDate ? expDate < today : false;
        const isExpiringSoon = expDate ? (expDate >= today && expDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) : false;
        const statusVal = isExpired ? 'Expired' : (isExpiringSoon ? 'Expiring Soon' : 'Active');

        let priorityVal: DashboardItem['priority'] = 'Low';
        if (isExpired) priorityVal = 'Critical';
        else if (isExpiringSoon) priorityVal = 'High';

        const shares = docShareMap.get(b.serial_no) || 0;
        let shareStatusVal: DashboardItem['shareStatus'] = 'Not Shared';
        if (shares > 2) shareStatusVal = 'Most Shared';
        else if (shares > 0) shareStatusVal = 'Shared';

        allUnifiedItems.push({
          id: `bg-${b.id}`,
          sn: b.serial_no || '',
          module: 'bg',
          subType: 'Bank Guarantee',
          name: b.bg_no || 'N/A',
          category: b.bank_name || 'N/A',
          status: statusVal,
          expiryDate: b.expiry_date || null,
          premium: b.amount ? Number(b.amount) : 0,
          shareCount: shares,
          renewalCount: 0,
          priority: priorityVal,
          renewalStatus: 'No Renewal Required',
          shareStatus: shareStatusVal,
          created_at: b.created_at || b.timestamp || '',
          need_renewal: isExpired || isExpiringSoon
        });
      });

      // Add Work Orders
      dWorkOrders.forEach(w => {
        const shares = docShareMap.get(w.serial_no) || 0;
        let shareStatusVal: DashboardItem['shareStatus'] = 'Not Shared';
        if (shares > 2) shareStatusVal = 'Most Shared';
        else if (shares > 0) shareStatusVal = 'Shared';

        allUnifiedItems.push({
          id: `wo-${w.id}`,
          sn: w.serial_no || `WO-${w.id}`,
          module: 'work_order',
          subType: 'Work Order',
          name: w.scheme || w.department || 'Work Order',
          category: w.department || w.state || 'Work Orders',
          status: 'Active',
          expiryDate: null,
          premium: w.total_value ? Number(w.total_value) : 0,
          shareCount: shares,
          renewalCount: 0,
          priority: 'Low',
          renewalStatus: 'No Renewal Required',
          shareStatus: shareStatusVal,
          created_at: w.created_at || w.date || '',
          need_renewal: false
        });
      });

      // Add Tenders
      dTenders.forEach(t => {
        const expField = t.tender_end_date || null;
        const expDate = expField ? new Date(expField) : null;
        const isExpired = expDate ? expDate < today : false;
        const isExpiringSoon = expDate ? (expDate >= today && expDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) : false;
        const statusVal = isExpired ? 'Expired' : (isExpiringSoon ? 'Expiring Soon' : 'Active');

        let priorityVal: DashboardItem['priority'] = 'Low';
        if (isExpired) priorityVal = 'Critical';
        else if (isExpiringSoon) priorityVal = 'High';

        const shares = docShareMap.get(t.serial_no) || 0;
        let shareStatusVal: DashboardItem['shareStatus'] = 'Not Shared';
        if (shares > 2) shareStatusVal = 'Most Shared';
        else if (shares > 0) shareStatusVal = 'Shared';

        allUnifiedItems.push({
          id: `tnd-${t.id}`,
          sn: t.serial_no || `TND-${t.id}`,
          module: 'tender',
          subType: 'Tender',
          name: t.tender_name || 'Tender',
          category: t.name_of_department || t.state_name || 'Tenders',
          status: statusVal,
          expiryDate: expField,
          premium: 0,
          shareCount: shares,
          renewalCount: 0,
          priority: priorityVal,
          renewalStatus: 'No Renewal Required',
          shareStatus: shareStatusVal,
          created_at: t.created_at || t.tender_start_date || '',
          need_renewal: isExpired || isExpiringSoon
        });
      });

      // Add Test Reports (Helper for 6 tables)
      const addTestReportsToUnified = (list: any[], subTypeLabel: string, prefix: string) => {
        list.forEach(tr => {
          const expField = tr.valid_upto || tr.valid_date || tr.validity_date || null;
          const expDate = expField ? new Date(expField) : null;
          const isExpired = expDate ? expDate < today : false;
          const isExpiringSoon = expDate ? (expDate >= today && expDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) : false;
          const statusVal = isExpired ? 'Expired' : (isExpiringSoon ? 'Expiring Soon' : 'Active');

          let priorityVal: DashboardItem['priority'] = 'Low';
          if (isExpired) priorityVal = 'Critical';
          else if (isExpiringSoon) priorityVal = 'High';

          const shares = docShareMap.get(tr.serial_no) || 0;
          let shareStatusVal: DashboardItem['shareStatus'] = 'Not Shared';
          if (shares > 2) shareStatusVal = 'Most Shared';
          else if (shares > 0) shareStatusVal = 'Shared';

          allUnifiedItems.push({
            id: `tr-${prefix}-${tr.id}`,
            sn: tr.serial_no || `TR-${tr.id}`,
            module: 'test_report',
            subType: subTypeLabel,
            name: tr.test_report_no || tr.model_no || tr.certificate_no || subTypeLabel,
            category: tr.pump_manufacturer || tr.type || 'Test Reports',
            status: statusVal,
            expiryDate: expField,
            premium: 0,
            shareCount: shares,
            renewalCount: 0,
            priority: priorityVal,
            renewalStatus: 'No Renewal Required',
            shareStatus: shareStatusVal,
            created_at: tr.created_at || '',
            need_renewal: isExpired || isExpiringSoon
          });
        });
      };

      addTestReportsToUnified(dSpvTR, 'Solar Photovoltaic Test Report', 'spv');
      addTestReportsToUnified(dPvWaterTR, 'PV Water Pumping Test Report', 'pvwater');
      addTestReportsToUnified(dPvModTR, 'PV Module Test Report', 'pvmod');
      addTestReportsToUnified(dPumpTR, 'Pump Test Report', 'pump');
      addTestReportsToUnified(dPannelTR, 'Panel Test Report', 'pannel');
      addTestReportsToUnified(dHlsTR, 'HLS Test Report', 'hls');

      // Add Experience Certificates
      dExpCerts.forEach(exp => {
        const shares = docShareMap.get(exp.serial_no) || 0;
        let shareStatusVal: DashboardItem['shareStatus'] = 'Not Shared';
        if (shares > 2) shareStatusVal = 'Most Shared';
        else if (shares > 0) shareStatusVal = 'Shared';

        allUnifiedItems.push({
          id: `exp-${exp.id}`,
          sn: exp.serial_no || `EXP-${exp.id}`,
          module: 'experience',
          subType: 'Experience Certificate',
          name: exp.work_name || exp.client_name || 'Experience Certificate',
          category: exp.client_name || exp.department || 'Experience Certificates',
          status: 'Active',
          expiryDate: exp.issue_date || null,
          premium: exp.value ? Number(exp.value) : 0,
          shareCount: shares,
          renewalCount: 0,
          priority: 'Low',
          renewalStatus: 'No Renewal Required',
          shareStatus: shareStatusVal,
          created_at: exp.created_at || exp.issue_date || '',
          need_renewal: false
        });
      });

      // Add Loans
      dLoans.forEach(l => {
        const expField = l.loan_end_date || null;
        const expDate = expField ? new Date(expField) : null;
        const isExpired = expDate ? expDate < today : false;
        const isExpiringSoon = expDate ? (expDate >= today && expDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) : false;
        const statusVal = isExpired ? 'Expired' : (isExpiringSoon ? 'Expiring Soon' : 'Active');

        let priorityVal: DashboardItem['priority'] = 'Low';
        if (isExpired) priorityVal = 'Critical';
        else if (isExpiringSoon) priorityVal = 'High';

        const shares = docShareMap.get(l.serial_no) || 0;
        let shareStatusVal: DashboardItem['shareStatus'] = 'Not Shared';
        if (shares > 2) shareStatusVal = 'Most Shared';
        else if (shares > 0) shareStatusVal = 'Shared';

        allUnifiedItems.push({
          id: `loan-${l.id}`,
          sn: l.serial_no || `LN-${l.id}`,
          module: 'loan',
          subType: 'Loan',
          name: l.loan_name || l.bank_name || 'Loan',
          category: l.bank_name || 'Loan',
          status: statusVal,
          expiryDate: expField,
          premium: l.amount ? Number(l.amount) : 0,
          shareCount: shares,
          renewalCount: 0,
          priority: priorityVal,
          renewalStatus: 'No Renewal Required',
          shareStatus: shareStatusVal,
          created_at: l.created_at || l.timestamp || l.loan_start_date || '',
          need_renewal: isExpired || isExpiringSoon
        });
      });

      // Apply the 11 MIS filters dynamically on the unified dataset
      let filteredItems = allUnifiedItems;

      // Dynamically extract categories from current unified items
      const dynamicCats = new Set<string>();
      allUnifiedItems.forEach(item => {
        if (item.category && item.category !== 'N/A' && item.category.trim()) {
          dynamicCats.add(item.category.trim());
        }
      });
      if (dynamicCats.size > 0) {
        setAvailableCategories(prev => Array.from(new Set([...prev, ...Array.from(dynamicCats)])).sort());
      }

      // Filter 9: Date Range Filter
      if (dateRange !== 'all') {
        filteredItems = filteredItems.filter(item => isDateInRange(item.created_at));
      }

      // Filter 1: Module Filter
      if (moduleFilter !== 'all') {
        if (moduleFilter === 'documents') {
          filteredItems = filteredItems.filter(item => item.module === 'document');
        } else if (moduleFilter === 'subscriptions') {
          filteredItems = filteredItems.filter(item => item.module === 'subscription');
        } else if (moduleFilter === 'insurance') {
          filteredItems = filteredItems.filter(item => item.module === 'insurance');
        } else if (moduleFilter === 'bg') {
          filteredItems = filteredItems.filter(item => item.module === 'bg');
        } else if (moduleFilter === 'work_orders') {
          filteredItems = filteredItems.filter(item => item.module === 'work_order');
        } else if (moduleFilter === 'tenders') {
          filteredItems = filteredItems.filter(item => item.module === 'tender');
        } else if (moduleFilter === 'test_reports') {
          filteredItems = filteredItems.filter(item => item.module === 'test_report');
        } else if (moduleFilter === 'experience') {
          filteredItems = filteredItems.filter(item => item.module === 'experience');
        } else if (moduleFilter === 'loan') {
          filteredItems = filteredItems.filter(item => item.module === 'loan');
        } else if (moduleFilter === 'vehicleinsurance') {
          filteredItems = filteredItems.filter(item => item.subType === 'Vehicle Insurance');
        } else if (moduleFilter === 'healthinsurance') {
          filteredItems = filteredItems.filter(item => item.subType === 'Health Insurance');
        } else if (moduleFilter === 'lifeinsurance') {
          filteredItems = filteredItems.filter(item => item.subType === 'Life Insurance');
        } else if (moduleFilter === 'firepolicy') {
          filteredItems = filteredItems.filter(item => item.subType === 'Fire Policy');
        } else if (moduleFilter === 'workman') {
          filteredItems = filteredItems.filter(item => item.subType === 'Employee Compensation' || item.subType.includes('Compensation') || item.subType.includes('Workman'));
        } else if (moduleFilter === 'hls') {
          filteredItems = filteredItems.filter(item => item.subType === 'HLS Test Report');
        } else if (moduleFilter === 'pump') {
          filteredItems = filteredItems.filter(item => item.subType === 'Pump Test Report');
        } else if (moduleFilter === 'pannel') {
          filteredItems = filteredItems.filter(item => item.subType === 'Panel Test Report');
        } else if (moduleFilter === 'pv_module') {
          filteredItems = filteredItems.filter(item => item.subType === 'PV Module Test Report');
        } else if (moduleFilter === 'pv_water_pumping') {
          filteredItems = filteredItems.filter(item => item.subType === 'PV Water Pumping Test Report');
        } else if (moduleFilter === 'solar_photovoltaic') {
          filteredItems = filteredItems.filter(item => item.subType === 'Solar Photovoltaic Test Report');
        } else {
          filteredItems = filteredItems.filter(item => 
            item.subType.toLowerCase().replace(/[^a-z0-9]/g, '').includes(moduleFilter.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
            item.category.toLowerCase().replace(/[^a-z0-9]/g, '').includes(moduleFilter.toLowerCase().replace(/[^a-z0-9]/g, ''))
          );
        }
      }

      // Filter: Category Filter
      if (categoryFilter !== 'all' && categoryFilter.trim()) {
        filteredItems = filteredItems.filter(item => 
          item.category.toLowerCase().trim() === categoryFilter.toLowerCase().trim()
        );
      }

      // Filter 2: Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active') {
          filteredItems = filteredItems.filter(item => item.status === 'Active');
        } else if (statusFilter === 'expired') {
          filteredItems = filteredItems.filter(item => item.status === 'Expired');
        } else if (statusFilter === 'expiring_soon') {
          filteredItems = filteredItems.filter(item => item.status === 'Expiring Soon');
        } else if (statusFilter === 'pending_renewal') {
          filteredItems = filteredItems.filter(item => item.need_renewal && item.status !== 'Active');
        }
      }

      // Filter 3: Priority Filter
      if (priorityFilter !== 'all') {
        filteredItems = filteredItems.filter(item => item.priority.toLowerCase() === priorityFilter.toLowerCase());
      }

      // Filter 4: Renewal Filter
      if (renewalFilter !== 'all') {
        if (renewalFilter === 'required') {
          filteredItems = filteredItems.filter(item => item.renewalStatus === 'Renewal Required');
        } else if (renewalFilter === 'completed') {
          filteredItems = filteredItems.filter(item => item.renewalStatus === 'Renewal Completed');
        } else if (renewalFilter === 'no_required') {
          filteredItems = filteredItems.filter(item => item.renewalStatus === 'No Renewal Required');
        }
      }

      // Filter 5: Share Activity Filter
      if (shareFilter !== 'all') {
        if (shareFilter === 'shared') {
          filteredItems = filteredItems.filter(item => item.shareCount > 0);
        } else if (shareFilter === 'not_shared') {
          filteredItems = filteredItems.filter(item => item.shareCount === 0);
        } else if (shareFilter === 'most_shared') {
          filteredItems = filteredItems.filter(item => item.shareCount > 2);
        }
      }

      // Filter 6: Expiry Bucket Filter
      if (expiryBucket !== 'all') {
        filteredItems = filteredItems.filter(item => {
          if (!item.expiryDate) return false;
          const exp = new Date(item.expiryDate);
          const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (expiryBucket === 'expired') return diffDays < 0;
          if (expiryBucket === '0-7') return diffDays >= 0 && diffDays <= 7;
          if (expiryBucket === '8-30') return diffDays > 7 && diffDays <= 30;
          if (expiryBucket === '31-60') return diffDays > 30 && diffDays <= 60;
          if (expiryBucket === '60+') return diffDays > 60;
          return true;
        });
      }

      // Filter 7: Text Search Filter
      if (textSearch.trim()) {
        const query = textSearch.toLowerCase().trim();
        filteredItems = filteredItems.filter(item => 
          item.sn.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          item.subType.toLowerCase().includes(query)
        );
      }

      // Sort Filter (Filter 8)
      filteredItems.sort((a, b) => {
        if (sortBy === 'latest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'most_shared') {
          return b.shareCount - a.shareCount;
        }
        if (sortBy === 'most_renewed') {
          return b.renewalCount - a.renewalCount;
        }
        if (sortBy === 'nearest_expiry') {
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        }
        if (sortBy === 'highest_premium') {
          return b.premium - a.premium;
        }
        if (sortBy === 'lowest_premium') {
          return a.premium - b.premium;
        }
        return 0;
      });

      // Calculate KPI statistics from the filtered dataset
      const totalRecords = filteredItems.length;
      const totalDocs = filteredItems.filter(i => i.module === 'document').length;
      const totalSubs = filteredItems.filter(i => i.module === 'subscription').length;
      const totalInsurance = filteredItems.filter(i => i.module === 'insurance').length;
      const totalBgs = filteredItems.filter(i => i.module === 'bg').length;
      const totalWorkOrders = filteredItems.filter(i => i.module === 'work_order').length;
      const totalTenders = filteredItems.filter(i => i.module === 'tender').length;
      const totalTestReports = filteredItems.filter(i => i.module === 'test_report').length;
      const totalExperience = filteredItems.filter(i => i.module === 'experience').length;
      const totalLoans = filteredItems.filter(i => i.module === 'loan').length;
      
      const activeRecords = filteredItems.filter(i => i.status === 'Active').length;
      const expiredRecords = filteredItems.filter(i => i.status === 'Expired').length;
      const expiringSoon = filteredItems.filter(i => i.status === 'Expiring Soon').length;
      const pendingRenewals = filteredItems.filter(i => i.renewalStatus === 'Renewal Required').length;
      
      const totalShares = filteredItems.reduce((acc, i) => acc + i.shareCount, 0);
      const totalRenewals = filteredItems.reduce((acc, i) => acc + i.renewalCount, 0);

      // Calculations for module-specific counts
      const docsActive = filteredItems.filter(i => i.module === 'document' && i.status === 'Active').length;
      const docsExpired = filteredItems.filter(i => i.module === 'document' && i.status === 'Expired').length;
      const docsPendingRenewal = filteredItems.filter(i => i.module === 'document' && i.renewalStatus === 'Renewal Required').length;

      const subsActive = filteredItems.filter(i => i.module === 'subscription' && i.status === 'Active').length;
      const subsExpired = filteredItems.filter(i => i.module === 'subscription' && i.status === 'Expired').length;
      const subsPendingRenewal = filteredItems.filter(i => i.module === 'subscription' && i.renewalStatus === 'Renewal Required').length;

      const insActive = filteredItems.filter(i => i.module === 'insurance' && i.status === 'Active').length;
      const insExpired = filteredItems.filter(i => i.module === 'insurance' && i.status === 'Expired').length;
      const insPendingRenewal = filteredItems.filter(i => i.module === 'insurance' && i.renewalStatus === 'Renewal Required').length;

      const bgsActive = filteredItems.filter(i => i.module === 'bg' && i.status === 'Active').length;
      const bgsExpired = filteredItems.filter(i => i.module === 'bg' && i.status === 'Expired').length;
      const bgsPendingRenewal = filteredItems.filter(i => i.module === 'bg' && i.need_renewal && i.status !== 'Active').length;

      const woActive = filteredItems.filter(i => i.module === 'work_order' && i.status === 'Active').length;
      const woExpired = filteredItems.filter(i => i.module === 'work_order' && i.status === 'Expired').length;

      const tndActive = filteredItems.filter(i => i.module === 'tender' && i.status === 'Active').length;
      const tndExpired = filteredItems.filter(i => i.module === 'tender' && i.status === 'Expired').length;

      const trActive = filteredItems.filter(i => i.module === 'test_report' && i.status === 'Active').length;
      const trExpired = filteredItems.filter(i => i.module === 'test_report' && i.status === 'Expired').length;

      const expActive = filteredItems.filter(i => i.module === 'experience' && i.status === 'Active').length;
      const expExpired = filteredItems.filter(i => i.module === 'experience' && i.status === 'Expired').length;

      const loanActive = filteredItems.filter(i => i.module === 'loan' && i.status === 'Active').length;
      const loanExpired = filteredItems.filter(i => i.module === 'loan' && i.status === 'Expired').length;

      // Executive Insights
      // Highest Risk Category: Which module has the most expired items?
      let highestRiskCategory = 'None';
      const maxExpired = Math.max(docsExpired, subsExpired, insExpired, bgsExpired, woExpired, tndExpired, trExpired, expExpired, loanExpired);
      if (maxExpired > 0) {
        if (maxExpired === docsExpired) highestRiskCategory = 'Documents';
        else if (maxExpired === subsExpired) highestRiskCategory = 'Subscriptions';
        else if (maxExpired === insExpired) highestRiskCategory = 'Insurance';
        else if (maxExpired === bgsExpired) highestRiskCategory = 'Bank Guarantees';
        else if (maxExpired === woExpired) highestRiskCategory = 'Work Orders';
        else if (maxExpired === tndExpired) highestRiskCategory = 'Tenders';
        else if (maxExpired === trExpired) highestRiskCategory = 'Test Reports';
        else if (maxExpired === expExpired) highestRiskCategory = 'Experience Certificates';
        else highestRiskCategory = 'Loans';
      }

      // Most Shared Document
      let mostSharedDoc = 'None';
      let mostSharedCount = 0;
      const sharedDocsList = filteredItems.filter(i => i.shareCount > 0).sort((a, b) => b.shareCount - a.shareCount);
      if (sharedDocsList.length > 0) {
        mostSharedDoc = sharedDocsList[0].name;
        mostSharedCount = sharedDocsList[0].shareCount;
      }

      // Most Renewed Item
      let mostRenewedItem = 'None';
      let mostRenewedCount = 0;
      const renewedList = filteredItems.filter(i => i.renewalCount > 0).sort((a, b) => b.renewalCount - a.renewalCount);
      if (renewedList.length > 0) {
        mostRenewedItem = renewedList[0].name;
        mostRenewedCount = renewedList[0].renewalCount;
      }

      const complianceStatus = totalRecords > 0 ? Math.round((activeRecords / totalRecords) * 100) : 100;

      // Renewal Forecast boundaries
      let forecast7Days = 0;
      let forecast30Days = 0;
      let forecast60Days = 0;
      let forecast90Days = 0;

      filteredItems.forEach(item => {
        if (!item.expiryDate) return;
        const exp = new Date(item.expiryDate);
        const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0) {
          if (diff <= 7) forecast7Days++;
          if (diff <= 30) forecast30Days++;
          if (diff <= 60) forecast60Days++;
          if (diff <= 90) forecast90Days++;
        }
      });

      // Top Risk Items list (Critical Risk first)
      const topRiskItemsList = filteredItems
        .filter(item => item.status === 'Expired' || item.status === 'Expiring Soon' || item.priority === 'Critical')
        .slice(0, 5)
        .map(item => ({
          name: item.name,
          category: item.subType,
          expiryDate: item.expiryDate,
          riskLevel: item.priority
        }));

      // Gather critical warning alerts
      const criticalAlerts: SummaryData['criticalAlerts'] = [];
      filteredItems.forEach(item => {
        if (item.status === 'Expired') {
          criticalAlerts.push({
            id: `alert-exp-${item.id}`,
            type: 'expired',
            message: `${item.subType} "${item.name}" has expired!`,
            date: item.expiryDate || undefined
          });
        } else if (item.status === 'Expiring Soon') {
          criticalAlerts.push({
            id: `alert-soon-${item.id}`,
            type: 'expiring_soon',
            message: `${item.subType} "${item.name}" is expiring soon.`,
            date: item.expiryDate || undefined
          });
        }
      });

      // Compile Recent Activities matching date range
      const activities: SummaryData['recentActivities'] = [];
      
      docShareDetails.forEach((share, idx) => {
        if (isDateInRange(share.timestamp || share.created_at)) {
          activities.push({
            id: `act-share-${idx}`,
            date: share.timestamp || share.created_at,
            type: 'share',
            message: `Document "${share.document_name}" shared with ${share.name || 'Recipient'} via ${share.share_method}`
          });
        }
      });

      dDocRen.forEach((r, idx) => {
        if (isDateInRange(r.created_at) && docSerials.has(r.serial_no)) {
          activities.push({
            id: `act-doc-ren-${idx}`,
            date: r.created_at,
            type: 'renewal',
            message: `Document Serial "${r.serial_no}" was renewed (Next Expiry: ${formatDate(r.new_renewal_date)})`
          });
        }
      });

      dVehRen.forEach((r, idx) => {
        if (isDateInRange(r.created_at) && insSerials.has(r.serial_no)) {
          activities.push({
            id: `act-veh-ren-${idx}`,
            date: r.created_at,
            type: 'renewal',
            message: `Vehicle Policy Serial "${r.serial_no}" renewed successfully.`
          });
        }
      });

      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Labels formatting
      const dateRangeLabelMap: Record<string, string> = {
        all: 'All Time',
        today: 'Today',
        yesterday: 'Yesterday',
        '7days': 'Last 7 Days',
        '30days': 'Last 30 Days',
        month: 'This Month',
        lastmonth: 'Last Month',
        quarter: 'This Quarter',
        year: 'This Year',
        custom: 'Custom Date Range'
      };

      const finalReport: SummaryData = {
        companyName: selectedCompany,
        generatedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        generatedBy: 'System Administrator',
        reportTypeLabel: [
          moduleFilter === 'all' ? 'Full Executive Summary' : `${moduleFilter.toUpperCase()} Module Summary`,
          categoryFilter !== 'all' ? `Category: ${categoryFilter}` : null
        ].filter(Boolean).join(' | '),
        dateRangeLabel: dateRangeLabelMap[dateRange] || 'All Time',

        totalRecords,
        totalDocs,
        totalSubs,
        totalInsurance,
        totalBgs,
        totalWorkOrders,
        totalTenders,
        totalTestReports,
        totalExperience,
        totalLoans,
        activeRecords,
        expiredRecords,
        expiringSoon,
        pendingRenewals,
        totalShares,
        totalRenewals,

        highestRiskCategory,
        mostSharedDoc,
        mostSharedCount,
        mostRenewedItem,
        mostRenewedCount,
        complianceStatus,

        forecast7Days,
        forecast30Days,
        forecast60Days,
        forecast90Days,

        criticalAlerts: criticalAlerts.slice(0, 5),
        topRiskItems: topRiskItemsList,
        documents: filteredItems.filter(i => i.module === 'document'),
        subscriptions: filteredItems.filter(i => i.module === 'subscription'),
        insurance: filteredItems.filter(i => i.module === 'insurance'),
        bgs: filteredItems.filter(i => i.module === 'bg'),
        workOrders: filteredItems.filter(i => i.module === 'work_order'),
        tenders: filteredItems.filter(i => i.module === 'tender'),
        testReports: filteredItems.filter(i => i.module === 'test_report'),
        experience: filteredItems.filter(i => i.module === 'experience'),
        loans: filteredItems.filter(i => i.module === 'loan'),
        recentActivities: activities.slice(0, 8),

        // status matrix details
        docsActive,
        docsExpired,
        docsPendingRenewal,
        subsActive,
        subsExpired,
        subsPendingRenewal,
        insActive,
        insExpired,
        insPendingRenewal,
        bgsActive,
        bgsExpired,
        bgsPendingRenewal,
        woActive,
        woExpired,
        tndActive,
        tndExpired,
        trActive,
        trExpired,
        expActive,
        expExpired,
        loanActive,
        loanExpired
      };

      setReportData(finalReport);
      setLastGeneratedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      toast.success('MIS Dashboard Compiled Successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to compile filtered report data');
    } finally {
      setIsGenerating(false);
    }
  };

  // EXPORT UTILITIES
  const handleExportExcel = () => {
    if (!reportData) return;

    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // 1. Summary Sheet Data
    const summaryRows = [
      ["Executive Summary Report", ""],
      ["Company Name", reportData.companyName],
      ["Generated On", reportData.generatedAt],
      ["Generated By", reportData.generatedBy],
      ["Scope", reportData.reportTypeLabel],
      ["Date Range", reportData.dateRangeLabel],
      [],
      ["KEY PERFORMANCE INDICATORS", ""],
      ["Indicator", "Value"],
      ["Total Records", reportData.totalRecords],
      ["Total Documents", reportData.totalDocs],
      ["Total Subscriptions", reportData.totalSubs],
      ["Total Insurance Policies", reportData.totalInsurance],
      ["Total Bank Guarantees", reportData.totalBgs],
      ["Total Work Orders", reportData.totalWorkOrders || 0],
      ["Total Tenders", reportData.totalTenders || 0],
      ["Total Test Reports", reportData.totalTestReports || 0],
      ["Total Experience Certificates", reportData.totalExperience || 0],
      ["Total Loans", reportData.totalLoans || 0],
      ["Active Records", reportData.activeRecords],
      ["Expired Records", reportData.expiredRecords],
      ["Expiring Soon", reportData.expiringSoon],
      ["Pending Renewals", reportData.pendingRenewals],
      ["Total Share Count", reportData.totalShares],
      ["Total Renewals Count", reportData.totalRenewals],
      ["Compliance Status (%)", `${reportData.complianceStatus}%`],
      [],
      ["RENEWAL FORECAST", ""],
      ["Horizon", "Forecast Count"],
      ["Renewals in Next 7 Days", reportData.forecast7Days],
      ["Renewals in Next 30 Days", reportData.forecast30Days],
      ["Renewals in Next 60 Days", reportData.forecast60Days],
      ["Renewals in Next 90 Days", reportData.forecast90Days],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // 2. Documents Sheet Data
    const docHeaders = [["Serial No", "Document Name", "Category", "Status", "Expiry/Renewal Date", "Share Count", "Renewal Count", "Created At"]];
    const docRows = reportData.documents.map(d => [
      d.sn,
      d.name,
      d.category,
      d.status,
      d.expiryDate ? formatDate(d.expiryDate) : "-",
      d.shareCount,
      d.renewalCount,
      d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN') : "-"
    ]);
    const wsDocs = XLSX.utils.aoa_to_sheet([...docHeaders, ...docRows]);
    XLSX.utils.book_append_sheet(wb, wsDocs, "Documents");

    // 3. Subscriptions Sheet Data
    const subHeaders = [["Serial No", "Subscription Name", "Frequency", "Status", "End Date", "Renewal Count", "Created At"]];
    const subRows = reportData.subscriptions.map(s => [
      s.sn,
      s.name,
      s.category,
      s.status,
      s.expiryDate ? formatDate(s.expiryDate) : "-",
      s.renewalCount,
      s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : "-"
    ]);
    const wsSubs = XLSX.utils.aoa_to_sheet([...subHeaders, ...subRows]);
    XLSX.utils.book_append_sheet(wb, wsSubs, "Subscriptions");

    // 4. Insurance Sheet Data
    const insHeaders = [["Serial No", "Policy/Registration No", "Insurance Type", "Status", "Premium", "Expiry Date", "Renewal Count", "Share Count", "Created At"]];
    const insRows = reportData.insurance.map(i => [
      i.sn,
      i.name,
      i.subType,
      i.status,
      i.premium,
      i.expiryDate ? formatDate(i.expiryDate) : "-",
      i.renewalCount,
      i.shareCount,
      i.created_at ? new Date(i.created_at).toLocaleDateString('en-IN') : "-"
    ]);
    const wsIns = XLSX.utils.aoa_to_sheet([...insHeaders, ...insRows]);
    XLSX.utils.book_append_sheet(wb, wsIns, "Insurances");

    // 5. BG Sheet Data
    const bgHeaders = [["Serial No", "BG Number", "Bank Name", "Status", "Amount", "Expiry Date", "Share Count", "Created At"]];
    const bgRows = (reportData.bgs || []).map(b => [
      b.sn,
      b.name,
      b.category,
      b.status,
      b.premium, // Amount mapped to premium/value
      b.expiryDate ? formatDate(b.expiryDate) : "-",
      b.shareCount,
      b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN') : "-"
    ]);
    const wsBgs = XLSX.utils.aoa_to_sheet([...bgHeaders, ...bgRows]);
    XLSX.utils.book_append_sheet(wb, wsBgs, "Bank Guarantees");

    // 6. Work Orders Sheet Data
    const woHeaders = [["Serial No", "Scheme/Department", "Category/State", "Status", "Total Value", "Created At"]];
    const woRows = (reportData.workOrders || []).map(w => [
      w.sn,
      w.name,
      w.category,
      w.status,
      w.premium,
      w.created_at ? new Date(w.created_at).toLocaleDateString('en-IN') : "-"
    ]);
    const wsWo = XLSX.utils.aoa_to_sheet([...woHeaders, ...woRows]);
    XLSX.utils.book_append_sheet(wb, wsWo, "Work Orders");

    // 7. Tenders Sheet Data
    const tndHeaders = [["Serial No", "Tender Name", "Department/State", "Status", "Expiry Date", "Created At"]];
    const tndRows = (reportData.tenders || []).map(t => [
      t.sn,
      t.name,
      t.category,
      t.status,
      t.expiryDate ? formatDate(t.expiryDate) : "-",
      t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : "-"
    ]);
    const wsTnd = XLSX.utils.aoa_to_sheet([...tndHeaders, ...tndRows]);
    XLSX.utils.book_append_sheet(wb, wsTnd, "Tenders");

    // 8. Test Reports Sheet Data
    const trHeaders = [["Serial No", "Report/Model No", "Type/Category", "Status", "Valid Date", "Created At"]];
    const trRows = (reportData.testReports || []).map(r => [
      r.sn,
      r.name,
      r.category,
      r.status,
      r.expiryDate ? formatDate(r.expiryDate) : "-",
      r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : "-"
    ]);
    const wsTr = XLSX.utils.aoa_to_sheet([...trHeaders, ...trRows]);
    XLSX.utils.book_append_sheet(wb, wsTr, "Test Reports");

    // 9. Experience Certificates Sheet Data
    const expHeaders = [["Serial No", "Work/Client Name", "Department", "Status", "Value", "Issue Date", "Created At"]];
    const expRows = (reportData.experience || []).map(e => [
      e.sn,
      e.name,
      e.category,
      e.status,
      e.premium,
      e.expiryDate ? formatDate(e.expiryDate) : "-",
      e.created_at ? new Date(e.created_at).toLocaleDateString('en-IN') : "-"
    ]);
    const wsExp = XLSX.utils.aoa_to_sheet([...expHeaders, ...expRows]);
    XLSX.utils.book_append_sheet(wb, wsExp, "Experience Certificates");

    // 10. Loans Sheet Data
    const loanHeaders = [["Serial No", "Loan Name", "Bank Name", "Status", "Amount", "End Date", "Created At"]];
    const loanRows = (reportData.loans || []).map(l => [
      l.sn,
      l.name,
      l.category,
      l.status,
      l.premium,
      l.expiryDate ? formatDate(l.expiryDate) : "-",
      l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN') : "-"
    ]);
    const wsLoan = XLSX.utils.aoa_to_sheet([...loanHeaders, ...loanRows]);
    XLSX.utils.book_append_sheet(wb, wsLoan, "Loans");

    // Auto-adjust column widths
    const sheets = [wsSummary, wsDocs, wsSubs, wsIns, wsBgs, wsWo, wsTnd, wsTr, wsExp, wsLoan];
    sheets.forEach(ws => {
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      const colWidths = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxLen = 10; // Default min width
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
          if (cell && cell.v) {
            maxLen = Math.max(maxLen, String(cell.v).length);
          }
        }
        colWidths.push({ wch: maxLen + 3 }); // Pad slightly
      }
      ws['!cols'] = colWidths;
    });

    // Write binary file and trigger download
    XLSX.writeFile(wb, `${reportData.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_MIS_Summary.xlsx`);
    toast.success('Excel spreadsheet (.xlsx) downloaded successfully');
  };

  const handleDownloadPDF = () => {
    if (!reportRef.current || !reportData) return;

    if (typeof window.html2pdf === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        executePDFExport();
      };
      document.body.appendChild(script);
    } else {
      executePDFExport();
    }
  };

  const executePDFExport = () => {
    const element = reportRef.current;
    if (!element) return;

    // Temporarily clean the outer container style/classes to avoid height overflows
    const originalContainerClass = element.className;
    element.className = ""; // Remove padding, background, and space-y-8

    // Select all pages inside the report container
    const pages = element.querySelectorAll('.pdf-page') as NodeListOf<HTMLDivElement>;
    
    // Track original styles
    const originalStyles: string[] = [];
    pages.forEach((page, index) => {
      originalStyles.push(page.getAttribute('style') || '');
      
      // The last page should NOT have pageBreakAfter: 'always'
      const isLastPage = index === pages.length - 1;
      page.style.width = '210mm';
      page.style.minHeight = '296mm';
      page.style.height = 'auto';
      page.style.boxSizing = 'border-box';
      page.style.margin = '0';
      page.style.border = 'none';
      page.style.boxShadow = 'none';
      
      if (isLastPage) {
        page.style.pageBreakAfter = 'avoid';
        page.style.breakAfter = 'avoid';
      } else {
        page.style.pageBreakAfter = 'always';
        page.style.breakAfter = 'page';
      }
    });

    const opt = {
      margin: 0,
      filename: `${reportData?.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Executive_Summary.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: 'css' }
    };

    window.html2pdf().set(opt).from(element).save().then(() => {
      // Restore original container classes
      element.className = originalContainerClass;
      // Restore original page styles
      pages.forEach((page, index) => {
        page.setAttribute('style', originalStyles[index]);
      });
    }).catch((err: any) => {
      console.error(err);
      // Fallback restore in case of error
      element.className = originalContainerClass;
      pages.forEach((page, index) => {
        page.setAttribute('style', originalStyles[index]);
      });
    });

    toast.success('PDF document compiled & downloaded');
  };

  // Dropdown helper functions
  const availableCompanies = (moduleFilter && moduleFilter !== 'all' && moduleCompaniesMap[moduleFilter])
    ? moduleCompaniesMap[moduleFilter]
    : companies;

  const filteredCompanyOptions = availableCompanies.filter(c => 
    c.toLowerCase().includes(companySearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24">
      
      {/* 1. Dashboard Main Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl shadow-md">
            <SlidersHorizontal size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">MIS Compliance Dashboard</h1>
            <p className="text-xs text-gray-500 mt-1">Management summary, critical risk matrices, and compliance tracking reports</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getActiveFilterCount() > 0 && (
            <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100">
              {getActiveFilterCount()} Active Filters
            </span>
          )}
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all"
          >
            <RefreshCw size={12} /> Reset Filters
          </button>
        </div>
      </div>

      {/* 2. Responsive Filters Panel Console */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">
          <Filter size={12} /> Dashboard Filter Configuration
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          
          {/* 1. Module Search Dropdown (Search + Dropdown) */}
          <div className="relative" ref={moduleDropdownRef}>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Module Filter</label>
            <button
              onClick={() => setIsModuleDropdownOpen(!isModuleDropdownOpen)}
              className="w-full px-3 py-2 text-left border border-gray-200 rounded-xl bg-white shadow-sm flex justify-between items-center text-xs text-gray-700 hover:border-gray-300 focus:outline-none transition-all"
            >
              <span className="truncate font-semibold">
                {MODULE_OPTIONS.find((opt) => opt.value === moduleFilter)?.label || 'Choose Module...'}
              </span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${isModuleDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isModuleDropdownOpen && (
              <div className="absolute z-50 w-64 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-64 flex flex-col overflow-hidden animate-scale-in">
                <div className="p-2 border-b border-gray-50 bg-gray-50/50 flex items-center gap-1.5">
                  <Search size={12} className="text-gray-400" />
                  <input
                    type="text"
                    value={moduleSearchQuery}
                    onChange={(e) => setModuleSearchQuery(e.target.value)}
                    placeholder="Search module or page..."
                    className="w-full text-[11px] outline-none border-none bg-transparent text-gray-700"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto flex-1 py-1 max-h-48 no-scrollbar">
                  {filteredModuleOptions.length > 0 ? (
                    filteredModuleOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          const newModule = opt.value;
                          setModuleFilter(newModule);
                          setIsModuleDropdownOpen(false);
                          setModuleSearchQuery('');

                          const validComps = newModule === 'all' ? companies : (moduleCompaniesMap[newModule] || []);
                          if (selectedCompany && validComps.length > 0 && !validComps.includes(selectedCompany)) {
                            setSelectedCompany('');
                            setReportData(null);
                          }
                        }}
                        className={`w-full text-left px-3 py-2 text-[11px] hover:bg-indigo-50/50 flex items-center justify-between transition-colors ${
                          moduleFilter === opt.value ? 'text-indigo-600 font-semibold bg-indigo-50/20' : 'text-gray-700'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {moduleFilter === opt.value && <Check size={12} className="text-indigo-600" />}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-[10px] text-gray-400">No modules matched</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Company Search Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Company Selection</label>
            <button
              onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
              className="w-full px-3 py-2 text-left border border-gray-200 rounded-xl bg-white shadow-sm flex justify-between items-center text-xs text-gray-700 hover:border-gray-300 focus:outline-none transition-all"
            >
              <span className="truncate font-semibold">{selectedCompany || 'Choose Company...'}</span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCompanyDropdownOpen && (
              <div className="absolute z-50 w-64 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-64 flex flex-col overflow-hidden animate-scale-in">
                <div className="p-2 border-b border-gray-50 bg-gray-50/50 flex items-center gap-1.5">
                  <Search size={12} className="text-gray-400" />
                  <input
                    type="text"
                    value={companySearchQuery}
                    onChange={(e) => setCompanySearchQuery(e.target.value)}
                    placeholder="Type to search..."
                    className="w-full text-[11px] outline-none border-none bg-transparent text-gray-700"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto flex-1 py-1 max-h-48 no-scrollbar">
                  {filteredCompanyOptions.length > 0 ? (
                    filteredCompanyOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setSelectedCompany(opt);
                          setIsCompanyDropdownOpen(false);
                          setCompanySearchQuery('');
                        }}
                        className={`w-full text-left px-3 py-2 text-[11px] hover:bg-indigo-50/50 flex items-center justify-between transition-colors ${
                          selectedCompany === opt ? 'text-indigo-600 font-semibold bg-indigo-50/20' : 'text-gray-700'
                        }`}
                      >
                        <span className="truncate">{opt}</span>
                        {selectedCompany === opt && <Check size={12} className="text-indigo-600" />}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-[10px] text-gray-400">No companies matched</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Category Search Dropdown */}
          <div className="relative" ref={categoryDropdownRef}>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category Filter</label>
            <button
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="w-full px-3 py-2 text-left border border-gray-200 rounded-xl bg-white shadow-sm flex justify-between items-center text-xs text-gray-700 hover:border-gray-300 focus:outline-none transition-all"
            >
              <span className="truncate font-semibold font-sans">
                {categoryFilter === 'all' ? 'All Categories' : categoryFilter}
              </span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCategoryDropdownOpen && (
              <div className="absolute z-50 w-64 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-64 flex flex-col overflow-hidden animate-scale-in">
                <div className="p-2 border-b border-gray-50 bg-gray-50/50 flex items-center gap-1.5">
                  <Search size={12} className="text-gray-400" />
                  <input
                    type="text"
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    placeholder="Search category..."
                    className="w-full text-[11px] outline-none border-none bg-transparent text-gray-700"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto flex-1 py-1 max-h-48 no-scrollbar">
                  <button
                    onClick={() => {
                      setCategoryFilter('all');
                      setIsCategoryDropdownOpen(false);
                      setCategorySearchQuery('');
                    }}
                    className={`w-full text-left px-3 py-2 text-[11px] hover:bg-indigo-50/50 flex items-center justify-between transition-colors ${
                      categoryFilter === 'all' ? 'text-indigo-600 font-semibold bg-indigo-50/20' : 'text-gray-700'
                    }`}
                  >
                    <span className="truncate">All Categories</span>
                    {categoryFilter === 'all' && <Check size={12} className="text-indigo-600" />}
                  </button>
                  {filteredCategoryOptions.length > 0 ? (
                    filteredCategoryOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setCategoryFilter(opt);
                          setIsCategoryDropdownOpen(false);
                          setCategorySearchQuery('');
                        }}
                        className={`w-full text-left px-3 py-2 text-[11px] hover:bg-indigo-50/50 flex items-center justify-between transition-colors ${
                          categoryFilter === opt ? 'text-indigo-600 font-semibold bg-indigo-50/20' : 'text-gray-700'
                        }`}
                      >
                        <span className="truncate">{opt}</span>
                        {categoryFilter === opt && <Check size={12} className="text-indigo-600" />}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-[10px] text-gray-400">No categories matched</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Date range selection */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="month">This Month</option>
              <option value="lastmonth">Last Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="pending_renewal">Pending Renewal</option>
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Priority Filter</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Renewal Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Renewal Filter</label>
            <select
              value={renewalFilter}
              onChange={(e) => setRenewalFilter(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="required">Renewal Required</option>
              <option value="completed">Renewal Completed</option>
              <option value="no_required">No Renewal Required</option>
            </select>
          </div>

          {/* Share Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Share Filter</label>
            <select
              value={shareFilter}
              onChange={(e) => setShareFilter(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="shared">Shared</option>
              <option value="not_shared">Not Shared</option>
              <option value="most_shared">Most Shared</option>
            </select>
          </div>

          {/* Expiry Bucket Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Expiry Bucket Filter</label>
            <select
              value={expiryBucket}
              onChange={(e) => setExpiryBucket(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="expired">Expired</option>
              <option value="0-7">Expiring in 0–7 Days</option>
              <option value="8-30">Expiring in 8–30 Days</option>
              <option value="31-60">Expiring in 31–60 Days</option>
              <option value="60+">Expiring in 60+ Days</option>
            </select>
          </div>

          {/* Sort By selection */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Sort By Filter</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="latest">Latest Added</option>
              <option value="oldest">Oldest Added</option>
              <option value="most_shared">Most Shared</option>
              <option value="most_renewed">Most Renewed</option>
              <option value="nearest_expiry">Nearest Expiry</option>
              <option value="highest_premium">Highest Premium</option>
              <option value="lowest_premium">Lowest Premium</option>
            </select>
          </div>

          {/* Search filter text input */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Search Keywords</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={textSearch}
                onChange={(e) => setTextSearch(e.target.value)}
                placeholder="Serial, name, policy..."
                className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-400"
              />
            </div>
          </div>

        </div>

        {/* Custom date boundaries pickers */}
        {dateRange === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-fade-in">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">Custom Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">Custom End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Selected chips representation */}
        {getActiveFilterCount() > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-gray-50">
            <span className="text-[10px] text-gray-400 font-bold uppercase mr-1">Applied:</span>
            {selectedCompany && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full border">
                Company: {selectedCompany}
                <X size={10} className="cursor-pointer" onClick={() => setSelectedCompany('')} />
              </span>
            )}
            {moduleFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full border">
                Module: {moduleFilter}
                <X size={10} className="cursor-pointer" onClick={() => setModuleFilter('all')} />
              </span>
            )}
            {categoryFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full border">
                Category: {categoryFilter}
                <X size={10} className="cursor-pointer" onClick={() => setCategoryFilter('all')} />
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full border">
                Status: {statusFilter}
                <X size={10} className="cursor-pointer" onClick={() => setStatusFilter('all')} />
              </span>
            )}
            {priorityFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full border">
                Priority: {priorityFilter}
                <X size={10} className="cursor-pointer" onClick={() => setPriorityFilter('all')} />
              </span>
            )}
            {renewalFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full border">
                Renewal: {renewalFilter}
                <X size={10} className="cursor-pointer" onClick={() => setRenewalFilter('all')} />
              </span>
            )}
            {shareFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full border">
                Share: {shareFilter}
                <X size={10} className="cursor-pointer" onClick={() => setShareFilter('all')} />
              </span>
            )}
            {expiryBucket !== 'all' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full border">
                Expiry Bucket: {expiryBucket}
                <X size={10} className="cursor-pointer" onClick={() => setExpiryBucket('all')} />
              </span>
            )}
            {textSearch.trim() && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full border">
                Search: "{textSearch}"
                <X size={10} className="cursor-pointer" onClick={() => setTextSearch('')} />
              </span>
            )}
          </div>
        )}

        {/* Action Panel Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-gray-100 gap-4">
          <div className="text-[11px] text-gray-400">
            {lastGeneratedAt && (
              <span className="flex items-center gap-1.5 font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                <CheckCircle2 size={13} /> Last generated at {lastGeneratedAt}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating || isLoading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="animate-spin" size={14} />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  <span>Generate Report</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={!reportData || isGenerating}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={!reportData || isGenerating}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <FileSpreadsheet size={14} />
              <span>Excel Export</span>
            </button>
           
           
          </div>
        </div>
      </div>

      {/* 3. Loading State indicator */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-500 font-semibold text-xs">Aggregating records & compiling dashboard matrices...</p>
        </div>
      )}

      {/* 4. Empty State selector message */}
      {!reportData && !isGenerating && (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-100 text-center">
          <FolderOpen className="h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-gray-900 font-bold text-sm">Dashboard Empty</h3>
          <p className="text-gray-400 text-xs mt-1 max-w-sm">Choose a company, customize the MIS filters, and click "Generate Report" to view executive insights and export documents.</p>
        </div>
      )}

      {/* 5. Complete MIS Dashboard Statistics & Insights Blocks */}
      {reportData && !isGenerating && (
        <div className="space-y-6 animate-fade-in">
          
          {/* 5.1 Dashboard Summary Cards Grid (11 KPI Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            
            {/* 1. Total Records */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Records</span>
                <span className="text-xl font-black text-gray-800 block mt-1">{reportData.totalRecords}</span>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Layers size={18} /></div>
            </div>

            {/* 2. Total Documents */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Docs</span>
                <span className="text-xl font-black text-gray-800 block mt-1">{reportData.totalDocs}</span>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={18} /></div>
            </div>

            {/* 3. Total Subscriptions */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Subs</span>
                <span className="text-xl font-black text-gray-800 block mt-1">{reportData.totalSubs}</span>
              </div>
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><CreditCard size={18} /></div>
            </div>

            {/* 4. Total Insurance Policies */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Insurance</span>
                <span className="text-xl font-black text-gray-800 block mt-1">{reportData.totalInsurance}</span>
              </div>
              <div className="p-2 bg-teal-50 text-teal-600 rounded-lg"><Shield size={18} /></div>
            </div>

            {/* 4.5 Total Bank Guarantees */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total BGs</span>
                <span className="text-xl font-black text-gray-800 block mt-1">{reportData.totalBgs}</span>
              </div>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Building size={18} /></div>
            </div>

            {/* 4.6 Total Work Orders */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Work Orders</span>
                <span className="text-xl font-black text-gray-800 block mt-1">{reportData.totalWorkOrders || 0}</span>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Briefcase size={18} /></div>
            </div>

            {/* 4.7 Total Tenders */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Tenders</span>
                <span className="text-xl font-black text-gray-800 block mt-1">{reportData.totalTenders || 0}</span>
              </div>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><FileCheck size={18} /></div>
            </div>

            {/* 4.8 Total Test Reports */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Test Reports</span>
                <span className="text-xl font-black text-gray-800 block mt-1">{reportData.totalTestReports || 0}</span>
              </div>
              <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg"><FileSpreadsheet size={18} /></div>
            </div>

            {/* 4.9 Total Experience Certificates */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Experience</span>
                <span className="text-xl font-black text-gray-800 block mt-1">{reportData.totalExperience || 0}</span>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Award size={18} /></div>
            </div>

            {/* 4.95 Total Loans */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Loans</span>
                <span className="text-xl font-black text-gray-800 block mt-1">{reportData.totalLoans || 0}</span>
              </div>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Building size={18} /></div>
            </div>

            {/* 5. Active Records */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Records</span>
                <span className="text-xl font-black text-green-600 block mt-1">{reportData.activeRecords}</span>
              </div>
              <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle2 size={18} /></div>
            </div>

            {/* 6. Expired Records */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Expired Records</span>
                <span className="text-xl font-black text-red-600 block mt-1">{reportData.expiredRecords}</span>
              </div>
              <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertCircle size={18} /></div>
            </div>

            {/* 7. Expiring Soon */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Expiring Soon</span>
                <span className="text-xl font-black text-amber-500 block mt-1">{reportData.expiringSoon}</span>
              </div>
              <div className="p-2 bg-amber-50 text-amber-500 rounded-lg"><AlertTriangle size={18} /></div>
            </div>

            {/* 8. Pending Renewals */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Pending Renewals</span>
                <span className="text-xl font-black text-red-500 block mt-1">{reportData.pendingRenewals}</span>
              </div>
              <div className="p-2 bg-red-50 text-red-500 rounded-lg"><Clock size={18} /></div>
            </div>

            {/* 9. Total Shares */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Shares</span>
                <span className="text-xl font-black text-indigo-600 block mt-1">{reportData.totalShares}</span>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Share2 size={18} /></div>
            </div>

            {/* 10. Total Renewals */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Renewals</span>
                <span className="text-xl font-black text-teal-600 block mt-1">{reportData.totalRenewals}</span>
              </div>
              <div className="p-2 bg-teal-50 text-teal-600 rounded-lg"><RefreshCw size={18} /></div>
            </div>

          </div>

          {/* 5.2 Executive Insights Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp size={14} className="text-indigo-600" /> Executive Compliance Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              
              <div className="p-4 bg-red-50/30 border border-red-100/50 rounded-xl">
                <span className="block text-[10px] uppercase font-bold text-gray-400">Total Expired</span>
                <span className="text-xl font-black text-red-700 block mt-1">{reportData.expiredRecords}</span>
                <span className="text-[9px] text-gray-400 block mt-1">Requires immediate renewal</span>
              </div>

              <div className="p-4 bg-amber-50/30 border border-amber-100/50 rounded-xl">
                <span className="block text-[10px] uppercase font-bold text-gray-400">Upcoming Renewals</span>
                <span className="text-xl font-black text-amber-700 block mt-1">{reportData.expiringSoon}</span>
                <span className="text-[9px] text-gray-400 block mt-1">Due in next 30 days</span>
              </div>

              <div className="p-4 bg-indigo-50/30 border border-indigo-100/50 rounded-xl">
                <span className="block text-[10px] uppercase font-bold text-gray-400">Highest Risk Category</span>
                <span className="text-sm font-bold text-indigo-700 block mt-1.5 truncate">{reportData.highestRiskCategory}</span>
                <span className="text-[9px] text-gray-400 block mt-1">Most expired items</span>
              </div>

              <div className="p-4 bg-blue-50/30 border border-blue-100/50 rounded-xl">
                <span className="block text-[10px] uppercase font-bold text-gray-400">Most Shared Document</span>
                <span className="text-sm font-bold text-blue-700 block mt-1.5 truncate" title={reportData.mostSharedDoc}>{reportData.mostSharedDoc}</span>
                <span className="text-[9px] text-gray-400 block mt-1">Count: {reportData.mostSharedCount} times</span>
              </div>

              <div className="p-4 bg-teal-50/30 border border-teal-100/50 rounded-xl">
                <span className="block text-[10px] uppercase font-bold text-gray-400">Most Renewed Item</span>
                <span className="text-sm font-bold text-teal-700 block mt-1.5 truncate" title={reportData.mostRenewedItem}>{reportData.mostRenewedItem}</span>
                <span className="text-[9px] text-gray-400 block mt-1">Count: {reportData.mostRenewedCount} times</span>
              </div>

              <div className="p-4 bg-emerald-50/30 border border-emerald-100/50 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-400">Compliance Rating</span>
                  <span className="text-xl font-black text-emerald-700 block mt-1">{reportData.complianceStatus}%</span>
                </div>
                <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${reportData.complianceStatus}%` }}></div>
                </div>
              </div>

            </div>
          </div>

          {/* 5.3 Renewal Forecast & Top Risk Items Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Renewal Forecast Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 border-b pb-2">
                <Clock size={14} className="text-amber-500" /> Renewal Forecast Analytics
              </h3>
              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-gray-600">Renewals in Next 7 Days</span>
                  <span className="px-2.5 py-1 bg-red-50 text-red-600 font-bold rounded-lg">{reportData.forecast7Days}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-gray-600">Renewals in Next 30 Days</span>
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-600 font-bold rounded-lg">{reportData.forecast30Days}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-gray-600">Renewals in Next 60 Days</span>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-600 font-bold rounded-lg">{reportData.forecast60Days}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-gray-600">Renewals in Next 90 Days</span>
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 font-bold rounded-lg">{reportData.forecast90Days}</span>
                </div>
              </div>
            </div>

            {/* Top Risk Items */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 col-span-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 border-b pb-2">
                <AlertCircle size={14} className="text-red-500" /> Top Priority Risk Items
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                      <th className="p-2.5">Record Name</th>
                      <th className="p-2.5">Module Category</th>
                      <th className="p-2.5">Expiry Date</th>
                      <th className="p-2.5 text-center">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reportData.topRiskItems.length > 0 ? (
                      reportData.topRiskItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-semibold text-gray-900 truncate max-w-[200px]">{item.name}</td>
                          <td className="p-2.5 text-gray-500">{item.category}</td>
                          <td className="p-2.5 text-gray-600 font-medium">{item.expiryDate ? formatDate(item.expiryDate) : 'N/A'}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              item.riskLevel === 'Critical' ? 'bg-red-50 text-red-600 border border-red-100' : (item.riskLevel === 'High' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-gray-50 text-gray-600')
                            }`}>
                              {item.riskLevel}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-gray-400 text-xs">
                          No Risk Items Identified
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* 5.4 Live PDF Report Preview Page Container */}
          <div className="flex flex-col items-center overflow-x-auto p-4 bg-gray-100 rounded-2xl border border-gray-200 space-y-6">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">--- Executive PDF Print Format Preview ---</div>
            
            <div ref={reportRef} className="space-y-8 bg-gray-100 p-2">
              
              {/* PAGE 1: EXECUTIVE OVERVIEW */}
              <div className="pdf-page bg-white shadow-xl p-10 mx-auto relative border border-gray-200/50 block" style={{ width: '210mm', minHeight: '296mm', height: 'auto', boxSizing: 'border-box' }}>
                <div className="space-y-4 pb-4">
                  {/* Report Header block */}
                  <div className="flex justify-between items-start border-b-2 border-indigo-600 pb-5">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded inline-block mb-2">Executive Summary Report</div>
                      <h2 className="text-xl font-black text-gray-900 leading-tight">{reportData.companyName}</h2>
                      <p className="text-[9px] text-gray-400 mt-0.5">Consolidated MIS summary report filtered for compliance reviews</p>
                    </div>
                    <div className="text-right text-[10px] text-gray-500 space-y-1">
                      <div><strong>Generated By:</strong> {reportData.generatedBy}</div>
                      <div><strong>Generated On:</strong> {reportData.generatedAt}</div>
                      <div><strong>Scope:</strong> {reportData.reportTypeLabel}</div>
                    </div>
                  </div>

                  {/* High level status metrics matrix */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl text-center">
                      <span className="block text-[9px] uppercase font-bold text-gray-400">Total Records</span>
                      <span className="text-xl font-bold text-gray-800 block mt-1">{reportData.totalRecords}</span>
                    </div>
                    <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl text-center">
                      <span className="block text-[9px] uppercase font-bold text-gray-400">Total Expired</span>
                      <span className="text-xl font-bold text-red-600 block mt-1">{reportData.expiredRecords}</span>
                    </div>
                    <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl text-center">
                      <span className="block text-[9px] uppercase font-bold text-gray-400">Expiring Soon</span>
                      <span className="text-xl font-bold text-amber-600 block mt-1">{reportData.expiringSoon}</span>
                    </div>
                    <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl text-center">
                      <span className="block text-[9px] uppercase font-bold text-gray-400">Compliance Rate</span>
                      <span className="text-xl font-bold text-green-600 block mt-1">{reportData.complianceStatus}%</span>
                    </div>
                  </div>

                  {/* Critical Warning Alerts Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 border-b pb-1.5">
                      <AlertCircle size={14} className="text-red-500" />
                      Critical Alerts & Expirations
                    </h3>
                    {reportData.criticalAlerts.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {reportData.criticalAlerts.map((alert, idx) => (
                          <div key={idx} className={`p-3 rounded-lg border flex justify-between items-center text-xs ${
                            alert.type === 'expired' ? 'bg-red-50/50 border-red-100 text-red-700' : 'bg-amber-50/50 border-amber-100 text-amber-700'
                          }`}>
                            <span className="font-semibold">{alert.message}</span>
                            {alert.date && <span className="text-[10px] font-mono opacity-80">Due: {formatDate(alert.date)}</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-green-50/50 border border-green-100 text-green-700 text-xs rounded-xl flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        <span className="font-semibold">All items are fully compliant. No critical alerts found.</span>
                      </div>
                    )}
                  </div>

                  {/* Status Metric Matrix Table */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 border-b pb-1.5">Module Status Matrix</h3>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                          <th className="p-3">Module</th>
                          <th className="p-3 text-center">Total</th>
                          <th className="p-3 text-center">Active</th>
                          <th className="p-3 text-center">Expired / Attention</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="p-2 font-semibold text-gray-700">Documents</td>
                          <td className="p-2 text-center font-bold">{reportData.totalDocs}</td>
                          <td className="p-2 text-center text-green-600 font-bold">{reportData.docsActive}</td>
                          <td className="p-2 text-center text-red-600 font-bold">{reportData.docsExpired}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-semibold text-gray-700">Subscriptions</td>
                          <td className="p-2 text-center font-bold">{reportData.totalSubs}</td>
                          <td className="p-2 text-center text-green-600 font-bold">{reportData.subsActive}</td>
                          <td className="p-2 text-center text-red-600 font-bold">{reportData.subsExpired}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-semibold text-gray-700">Insurance Policies</td>
                          <td className="p-2 text-center font-bold">{reportData.totalInsurance}</td>
                          <td className="p-2 text-center text-green-600 font-bold">{reportData.insActive}</td>
                          <td className="p-2 text-center text-red-600 font-bold">{reportData.insExpired}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-semibold text-gray-700">Bank Guarantees</td>
                          <td className="p-2 text-center font-bold">{reportData.totalBgs}</td>
                          <td className="p-2 text-center text-green-600 font-bold">{reportData.bgsActive}</td>
                          <td className="p-2 text-center text-red-600 font-bold">{reportData.bgsExpired}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-semibold text-gray-700">Work Orders</td>
                          <td className="p-2 text-center font-bold">{reportData.totalWorkOrders || 0}</td>
                          <td className="p-2 text-center text-green-600 font-bold">{reportData.woActive || 0}</td>
                          <td className="p-2 text-center text-red-600 font-bold">{reportData.woExpired || 0}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-semibold text-gray-700">Tenders</td>
                          <td className="p-2 text-center font-bold">{reportData.totalTenders || 0}</td>
                          <td className="p-2 text-center text-green-600 font-bold">{reportData.tndActive || 0}</td>
                          <td className="p-2 text-center text-red-600 font-bold">{reportData.tndExpired || 0}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-semibold text-gray-700">Test Reports</td>
                          <td className="p-2 text-center font-bold">{reportData.totalTestReports || 0}</td>
                          <td className="p-2 text-center text-green-600 font-bold">{reportData.trActive || 0}</td>
                          <td className="p-2 text-center text-red-600 font-bold">{reportData.trExpired || 0}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-semibold text-gray-700">Experience Certificates</td>
                          <td className="p-2 text-center font-bold">{reportData.totalExperience || 0}</td>
                          <td className="p-2 text-center text-green-600 font-bold">{reportData.expActive || 0}</td>
                          <td className="p-2 text-center text-red-600 font-bold">{reportData.expExpired || 0}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-semibold text-gray-700">Loans</td>
                          <td className="p-2 text-center font-bold">{reportData.totalLoans || 0}</td>
                          <td className="p-2 text-center text-green-600 font-bold">{reportData.loanActive || 0}</td>
                          <td className="p-2 text-center text-red-600 font-bold">{reportData.loanExpired || 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Brief commentary text */}
                  <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/20 text-xs text-indigo-900/80 leading-relaxed">
                    <strong>MIS Dashboard Compliance Review Note:</strong> Current compliance rating is calculated at <strong>{reportData.complianceStatus}%</strong>. Active filters have narrowed focus to <strong>{reportData.totalRecords} records</strong> matching your parameters.
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="absolute bottom-8 left-10 right-10 flex justify-between items-center border-t pt-4 text-[10px] text-gray-400">
                  <span>DS Dashboard MIS Reports Console</span>
                  <span>Page 1 of 7</span>
                </div>
              </div>

              {/* PAGE 2: DOCUMENTS & SUBSCRIPTIONS SUMMARY */}
              <div className="pdf-page bg-white shadow-xl p-10 mx-auto relative border border-gray-200/50 block" style={{ width: '210mm', minHeight: '296mm', height: 'auto', boxSizing: 'border-box' }}>
                <div className="space-y-4 pb-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">{reportData.companyName} - Documents & Subscriptions</h2>
                    <span className="text-[10px] text-gray-400 font-mono">Scope: {reportData.dateRangeLabel}</span>
                  </div>

                  {/* Documents Section Grouped by Category */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b pb-1.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                        Documents Summary (Category Sections)
                      </h3>
                      <span className="text-[9px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-bold">
                        Active: {reportData.docsActive} | Expired: {reportData.docsExpired}
                      </span>
                    </div>
                    {reportData.documents.length > 0 ? (
                      (() => {
                        const docsByCategory: Record<string, typeof reportData.documents> = {};
                        reportData.documents.forEach(doc => {
                          const cat = doc.category || 'Uncategorized';
                          if (!docsByCategory[cat]) docsByCategory[cat] = [];
                          docsByCategory[cat].push(doc);
                        });
                        return (
                          <div className="space-y-3">
                            {Object.entries(docsByCategory).map(([catName, catDocs]) => (
                              <div key={catName} className="space-y-1.5 border border-indigo-100/60 rounded-lg p-2.5 bg-indigo-50/10">
                                <div className="flex items-center justify-between bg-indigo-50/80 px-2.5 py-1 rounded text-indigo-950 border border-indigo-100">
                                  <span className="text-[10px] font-bold uppercase tracking-wide">
                                    Category: {catName}
                                  </span>
                                  <span className="text-[8px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                                    {catDocs.length} {catDocs.length === 1 ? 'Document' : 'Documents'}
                                  </span>
                                </div>
                                <table className="w-full text-left border-collapse text-[10px]">
                                  <thead>
                                    <tr className="bg-white border-b border-gray-100 text-gray-500 font-bold uppercase">
                                      <th className="p-1.5">Serial</th>
                                      <th className="p-1.5">Document Name</th>
                                      <th className="p-1.5 text-center">Status</th>
                                      <th className="p-1.5 text-center">Expiry/Renewal Date</th>
                                      <th className="p-1.5 text-center w-12 font-medium">Shared</th>
                                      <th className="p-1.5 text-center w-12 font-medium">Renewed</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 bg-white">
                                    {catDocs.map((doc, idx) => (
                                      <tr key={idx}>
                                        <td className="p-1.5 font-mono font-bold text-indigo-600">{doc.sn}</td>
                                        <td className="p-1.5 font-medium text-gray-900 break-words whitespace-normal max-w-[220px]">{doc.name}</td>
                                        <td className="p-1.5 text-center">
                                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                            doc.status === 'Expired' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                                          }`}>
                                            {doc.status}
                                          </span>
                                        </td>
                                        <td className="p-1.5 text-center font-medium">{doc.expiryDate ? formatDate(doc.expiryDate) : '-'}</td>
                                        <td className="p-1.5 text-center font-bold">{doc.shareCount}</td>
                                        <td className="p-1.5 text-center font-bold">{doc.renewalCount}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="p-6 bg-gray-50 border border-dashed text-center text-xs text-gray-400 rounded-xl">
                        No Documents Available
                      </div>
                    )}
                  </div>

                  {/* Subscriptions Section */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Active Subscriptions Table</h3>
                      <span className="text-[9px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-bold">
                        Total Subscriptions: {reportData.totalSubs}
                      </span>
                    </div>
                    {reportData.subscriptions.length > 0 ? (
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                            <th className="p-2">Subscription Name</th>
                            <th className="p-2">Frequency</th>
                            <th className="p-2 text-center">Status</th>
                            <th className="p-2 text-center">End Date</th>
                            <th className="p-2 text-center">Renewal Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {reportData.subscriptions.map((sub, idx) => (
                            <tr key={idx}>
                              <td className="p-2 font-medium text-gray-900 truncate max-w-[200px]">{sub.name}</td>
                              <td className="p-2">{sub.category}</td>
                              <td className="p-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  sub.status === 'Expired' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                                }`}>
                                  {sub.status}
                                </span>
                              </td>
                              <td className="p-2 text-center font-medium">{sub.expiryDate ? formatDate(sub.expiryDate) : '-'}</td>
                              <td className="p-2 text-center font-bold">{sub.renewalCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-6 bg-gray-50 border border-dashed text-center text-xs text-gray-400 rounded-xl">
                        No Subscription Records Available
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute bottom-8 left-10 right-10 flex justify-between items-center border-t pt-4 text-[10px] text-gray-400">
                  <span>DS Dashboard MIS Reports Console</span>
                  <span>Page 2 of 7</span>
                </div>
              </div>

              {/* PAGE 3: INSURANCE SUMMARY & RECENT ACTIVITIES */}
              <div className="pdf-page bg-white shadow-xl p-10 mx-auto relative border border-gray-200/50 block" style={{ width: '210mm', minHeight: '296mm', height: 'auto', boxSizing: 'border-box' }}>
                <div className="space-y-4 pb-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">{reportData.companyName} - Insurances & Logs</h2>
                    <span className="text-[10px] text-gray-400 font-mono">Generated: {reportData.generatedAt}</span>
                  </div>

                  {/* Insurance Policies list */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Insurance Summary Table</h3>
                      <span className="text-[9px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-bold">
                        Active Policies: {reportData.insActive}
                      </span>
                    </div>
                    {reportData.insurance.length > 0 ? (
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                            <th className="p-2">Serial</th>
                            <th className="p-2">Insurance Type</th>
                            <th className="p-2">Policy Number</th>
                            <th className="p-2 text-center">Status</th>
                            <th className="p-2 text-right">Premium</th>
                            <th className="p-2 text-center">Expiry Date</th>
                            <th className="p-2 text-center">Renewals</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {reportData.insurance.map((ins, idx) => (
                            <tr key={idx}>
                              <td className="p-2 font-mono font-bold text-indigo-600">{ins.sn}</td>
                              <td className="p-2 font-medium text-gray-900">{ins.subType}</td>
                              <td className="p-2 font-mono text-[9px]">{ins.name}</td>
                              <td className="p-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  ins.status === 'Expired' ? 'bg-red-50 text-red-600' : (ins.status === 'Expiring Soon' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600')
                                }`}>
                                  {ins.status}
                                </span>
                              </td>
                              <td className="p-2 text-right font-medium">₹{ins.premium.toLocaleString('en-IN')}</td>
                              <td className="p-2 text-center font-medium">{ins.expiryDate ? formatDate(ins.expiryDate) : '-'}</td>
                              <td className="p-2 text-center font-bold">{ins.renewalCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-6 bg-gray-50 border border-dashed text-center text-xs text-gray-400 rounded-xl">
                        No Insurance Records Available
                      </div>
                    )}
                  </div>

                  {/* Share and Renewal stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl space-y-1">
                      <span className="block text-[9px] uppercase font-bold text-gray-500 border-b pb-1">Sharing stats</span>
                      <div className="space-y-1 text-[10px] text-gray-600">
                        <div className="flex justify-between"><span>Total Shared Items:</span><strong>{reportData.totalShares}</strong></div>
                        <div className="flex justify-between"><span>Email:</span><strong>{reportData.totalShares}</strong></div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl space-y-1">
                      <span className="block text-[9px] uppercase font-bold text-gray-500 border-b pb-1">Renewals stats</span>
                      <div className="space-y-1 text-[10px] text-gray-600">
                        <div className="flex justify-between"><span>Completed Renewals:</span><strong>{reportData.totalRenewals}</strong></div>
                        <div className="flex justify-between font-semibold text-indigo-600"><span>Pending Renewals:</span><strong>{reportData.pendingRenewals}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-8 left-10 right-10 flex justify-between items-center border-t pt-4 text-[10px] text-gray-400">
                  <span>DS Dashboard MIS Reports Console</span>
                  <span>Page 3 of 7</span>
                </div>
              </div>

              {/* PAGE 4: BANK GUARANTEES SUMMARY & RECENT ACTIVITIES */}
              <div className="pdf-page bg-white shadow-xl p-10 mx-auto relative border border-gray-200/50 block" style={{ width: '210mm', minHeight: '296mm', height: 'auto', boxSizing: 'border-box' }}>
                <div className="space-y-4 pb-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">{reportData.companyName} - Bank Guarantees & Logs</h2>
                    <span className="text-[10px] text-gray-400 font-mono">Generated: {reportData.generatedAt}</span>
                  </div>

                  {/* Bank Guarantees list */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Bank Guarantees Summary Table</h3>
                      <span className="text-[9px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-bold">
                        Active BGs: {reportData.bgsActive}
                      </span>
                    </div>
                    {reportData.bgs && reportData.bgs.length > 0 ? (
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                            <th className="p-2">Serial</th>
                            <th className="p-2">BG Number</th>
                            <th className="p-2">Bank Name</th>
                            <th className="p-2 text-center">Status</th>
                            <th className="p-2 text-right">Amount</th>
                            <th className="p-2 text-center">Expiry Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {reportData.bgs.map((bg, idx) => (
                            <tr key={idx}>
                              <td className="p-2 font-mono font-bold text-indigo-600">{bg.sn}</td>
                              <td className="p-2 font-medium text-gray-900">{bg.name}</td>
                              <td className="p-2">{bg.category}</td>
                              <td className="p-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  bg.status === 'Expired' ? 'bg-red-50 text-red-600' : (bg.status === 'Expiring Soon' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600')
                                }`}>
                                  {bg.status}
                                </span>
                              </td>
                              <td className="p-2 text-right font-medium">₹{bg.premium.toLocaleString('en-IN')}</td>
                              <td className="p-2 text-center font-medium">{bg.expiryDate ? formatDate(bg.expiryDate) : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-6 bg-gray-50 border border-dashed text-center text-xs text-gray-400 rounded-xl">
                        No Bank Guarantee Records Available
                      </div>
                    )}
                  </div>

                  {/* Recent Activities list */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 border-b pb-1">Recent Activities Logs</h3>
                    {reportData.recentActivities.length > 0 ? (
                      <div className="space-y-2">
                        {reportData.recentActivities.slice(0, 8).map((act, idx) => (
                          <div key={idx} className="flex gap-2 text-[10px] text-gray-600 items-start">
                            <span className="font-mono text-gray-400 shrink-0 w-20">{new Date(act.date).toLocaleDateString('en-IN')}</span>
                            <span className="truncate">{act.message}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 text-center text-[10px] text-gray-400 rounded-lg">
                        No recent activity logs available
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute bottom-8 left-10 right-10 flex justify-between items-center border-t pt-4 text-[10px] text-gray-400">
                  <span>DS Dashboard MIS Reports Console</span>
                  <span>Page 4 of 7</span>
                </div>
              </div>

              {/* PAGE 5: WORK ORDERS & TENDERS SUMMARY */}
              <div className="pdf-page bg-white shadow-xl p-10 mx-auto relative border border-gray-200/50 block" style={{ width: '210mm', minHeight: '296mm', height: 'auto', boxSizing: 'border-box' }}>
                <div className="space-y-4 pb-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">{reportData.companyName} - Work Orders & Tenders</h2>
                    <span className="text-[10px] text-gray-400 font-mono">Generated: {reportData.generatedAt}</span>
                  </div>

                  {/* Work Orders Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Work Orders Summary Table</h3>
                      <span className="text-[9px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-bold">
                        Total Work Orders: {reportData.totalWorkOrders || 0}
                      </span>
                    </div>
                    {reportData.workOrders && reportData.workOrders.length > 0 ? (
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                            <th className="p-2">Serial</th>
                            <th className="p-2">Scheme / Work Name</th>
                            <th className="p-2">Department</th>
                            <th className="p-2 text-center">Status</th>
                            <th className="p-2 text-right">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {reportData.workOrders.map((wo, idx) => (
                            <tr key={idx}>
                              <td className="p-2 font-mono font-bold text-indigo-600">{wo.sn}</td>
                              <td className="p-2 font-medium text-gray-900 truncate max-w-[180px]">{wo.name}</td>
                              <td className="p-2 text-gray-500">{wo.category}</td>
                              <td className="p-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  wo.status === 'Expired' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                                }`}>
                                  {wo.status}
                                </span>
                              </td>
                              <td className="p-2 text-right font-medium">{wo.premium ? `₹${wo.premium.toLocaleString('en-IN')}` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-6 bg-gray-50 border border-dashed text-center text-xs text-gray-400 rounded-xl">
                        No Work Orders Available
                      </div>
                    )}
                  </div>

                  {/* Tenders Section */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Tenders Summary Table</h3>
                      <span className="text-[9px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-bold">
                        Total Tenders: {reportData.totalTenders || 0}
                      </span>
                    </div>
                    {reportData.tenders && reportData.tenders.length > 0 ? (
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                            <th className="p-2">Serial</th>
                            <th className="p-2">Tender Name</th>
                            <th className="p-2">Department/State</th>
                            <th className="p-2 text-center">Status</th>
                            <th className="p-2 text-center">End Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {reportData.tenders.map((tnd, idx) => (
                            <tr key={idx}>
                              <td className="p-2 font-mono font-bold text-indigo-600">{tnd.sn}</td>
                              <td className="p-2 font-medium text-gray-900 truncate max-w-[180px]">{tnd.name}</td>
                              <td className="p-2 text-gray-500">{tnd.category}</td>
                              <td className="p-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  tnd.status === 'Expired' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                                }`}>
                                  {tnd.status}
                                </span>
                              </td>
                              <td className="p-2 text-center font-medium">{tnd.expiryDate ? formatDate(tnd.expiryDate) : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-6 bg-gray-50 border border-dashed text-center text-xs text-gray-400 rounded-xl">
                        No Tenders Available
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute bottom-8 left-10 right-10 flex justify-between items-center border-t pt-4 text-[10px] text-gray-400">
                  <span>DS Dashboard MIS Reports Console</span>
                  <span>Page 5 of 7</span>
                </div>
              </div>

              {/* PAGE 6: TEST REPORTS & EXPERIENCE CERTIFICATES */}
              <div className="pdf-page bg-white shadow-xl p-10 mx-auto relative border border-gray-200/50 block" style={{ width: '210mm', minHeight: '296mm', height: 'auto', boxSizing: 'border-box' }}>
                <div className="space-y-4 pb-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">{reportData.companyName} - Test Reports & Experience Certificates</h2>
                    <span className="text-[10px] text-gray-400 font-mono">Generated: {reportData.generatedAt}</span>
                  </div>

                  {/* Test Reports Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Test Reports Summary Table</h3>
                      <span className="text-[9px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-bold">
                        Total Test Reports: {reportData.totalTestReports || 0}
                      </span>
                    </div>
                    {reportData.testReports && reportData.testReports.length > 0 ? (
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                            <th className="p-2">Serial</th>
                            <th className="p-2">Report / Model No</th>
                            <th className="p-2">Category</th>
                            <th className="p-2 text-center">Status</th>
                            <th className="p-2 text-center">Valid Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {reportData.testReports.map((tr, idx) => (
                            <tr key={idx}>
                              <td className="p-2 font-mono font-bold text-indigo-600">{tr.sn}</td>
                              <td className="p-2 font-medium text-gray-900 truncate max-w-[180px]">{tr.name}</td>
                              <td className="p-2 text-gray-500">{tr.category}</td>
                              <td className="p-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  tr.status === 'Expired' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                                }`}>
                                  {tr.status}
                                </span>
                              </td>
                              <td className="p-2 text-center font-medium">{tr.expiryDate ? formatDate(tr.expiryDate) : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-6 bg-gray-50 border border-dashed text-center text-xs text-gray-400 rounded-xl">
                        No Test Reports Available
                      </div>
                    )}
                  </div>

                  {/* Experience Certificates Section */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Experience Certificates Summary Table</h3>
                      <span className="text-[9px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-bold">
                        Total Experience Certificates: {reportData.totalExperience || 0}
                      </span>
                    </div>
                    {reportData.experience && reportData.experience.length > 0 ? (
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                            <th className="p-2">Serial</th>
                            <th className="p-2">Work / Client Name</th>
                            <th className="p-2">Department</th>
                            <th className="p-2 text-right">Value</th>
                            <th className="p-2 text-center">Issue Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {reportData.experience.map((exp, idx) => (
                            <tr key={idx}>
                              <td className="p-2 font-mono font-bold text-indigo-600">{exp.sn}</td>
                              <td className="p-2 font-medium text-gray-900 truncate max-w-[180px]">{exp.name}</td>
                              <td className="p-2 text-gray-500">{exp.category}</td>
                              <td className="p-2 text-right font-medium">{exp.premium ? `₹${exp.premium.toLocaleString('en-IN')}` : '-'}</td>
                              <td className="p-2 text-center font-medium">{exp.expiryDate ? formatDate(exp.expiryDate) : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-6 bg-gray-50 border border-dashed text-center text-xs text-gray-400 rounded-xl">
                        No Experience Certificates Available
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute bottom-8 left-10 right-10 flex justify-between items-center border-t pt-4 text-[10px] text-gray-400">
                  <span>DS Dashboard MIS Reports Console</span>
                  <span>Page 6 of 7</span>
                </div>
              </div>

              {/* PAGE 7: LOANS SUMMARY */}
              <div className="pdf-page bg-white shadow-xl p-10 mx-auto relative border border-gray-200/50 block" style={{ width: '210mm', minHeight: '296mm', height: 'auto', boxSizing: 'border-box' }}>
                <div className="space-y-4 pb-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">{reportData.companyName} - Loans</h2>
                    <span className="text-[10px] text-gray-400 font-mono">Generated: {reportData.generatedAt}</span>
                  </div>

                  {/* Loans Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Loans Summary Table</h3>
                      <span className="text-[9px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-bold">
                        Total Loans: {reportData.totalLoans || 0}
                      </span>
                    </div>
                    {reportData.loans && reportData.loans.length > 0 ? (
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                            <th className="p-2">Serial</th>
                            <th className="p-2">Loan Name</th>
                            <th className="p-2">Bank Name</th>
                            <th className="p-2 text-center">Status</th>
                            <th className="p-2 text-right">Amount</th>
                            <th className="p-2 text-center">End Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {reportData.loans.map((ln, idx) => (
                            <tr key={idx}>
                              <td className="p-2 font-mono font-bold text-indigo-600">{ln.sn}</td>
                              <td className="p-2 font-medium text-gray-900 truncate max-w-[180px]">{ln.name}</td>
                              <td className="p-2 text-gray-500">{ln.category}</td>
                              <td className="p-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  ln.status === 'Expired' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                                }`}>
                                  {ln.status}
                                </span>
                              </td>
                              <td className="p-2 text-right font-medium">{ln.premium ? `₹${ln.premium.toLocaleString('en-IN')}` : '-'}</td>
                              <td className="p-2 text-center font-medium">{ln.expiryDate ? formatDate(ln.expiryDate) : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-6 bg-gray-50 border border-dashed text-center text-xs text-gray-400 rounded-xl">
                        No Loan Records Available
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute bottom-8 left-10 right-10 flex justify-between items-center border-t pt-4 text-[10px] text-gray-400">
                  <span>DS Dashboard MIS Reports Console</span>
                  <span>Page 7 of 7</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default Summary;
