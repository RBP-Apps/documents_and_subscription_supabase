import { useState } from 'react';
import { FileText, CreditCard, Shield, Landmark, Mail, FolderOpen } from 'lucide-react';
import AllDocuments from './document/AllDocuments';
import WorkOrders from './ProjectDocuments/WorkOrders/WorkOrders';
import Tenders from './ProjectDocuments/Tenders/Tenders';
import AllSubscriptions from './subscription/AllSubscriptions';
import AllBG from './bg/AllBG';
import VehicleInsurance from './Insurance/vehicle/vehicle';
import HealthInsurance from './Insurance/Health/Health';
import LifeInsurance from './Insurance/Life Insurance/LifeInsurance';
import Building from './Insurance/General/Building';
import WorkManCompensation from './Insurance/General/WorkManCompensation';
import CompanyStaff from './Insurance/General/CompanyStaff';
import Construction from './Insurance/General/Construction';
import AkashdeepComplex from './Insurance/General/AkashdeepComplex';
import FirePolicy from './Insurance/General/FirePolicy';
import PropertyTax from './PropertyTax/PropertyTax';
import EmailRenewal from './Email Renewal/EmailRenewal';
import HlsTestReports from './ProjectDocuments/TestReports/HlsTestReports';
import PumpTestReports from './ProjectDocuments/TestReports/PumpTestReports';
import PannelTestReports from './ProjectDocuments/TestReports/PannelTestReports';
import PumpExperience from './ExperienceCertificates/PumpExperience';
import useHeaderStore from '../store/headerStore';
import { useEffect } from 'react';

const ResourceManager = () => {
  const [activeTab, setActiveTab] = useState<'documents' | 'subscriptions' | 'bg' | 'insurance' | 'propertytax' | 'emailrenewal' | 'projectdocuments'>('documents');
  const [activeInsuranceSubTab, setActiveInsuranceSubTab] = useState<'vehicle' | 'health' | 'life' | 'general'>('vehicle');
  const [activeProjectSubTab, setActiveProjectSubTab] = useState<'workorders' | 'tenders' | 'testreports' | 'experiencecertificates'>('workorders');
  const [activeGeneralSubTab, setActiveGeneralSubTab] = useState<'building' | 'workman' | 'staff' | 'construction' | 'complex' | 'fire'>('building');
  const [activeTestReportSubTab, setActiveTestReportSubTab] = useState<'hls' | 'pump' | 'pannel'>('hls');
  const [activeExperienceSubTab, setActiveExperienceSubTab] = useState<'pump'>('pump');
  const { setTitle } = useHeaderStore();

  useEffect(() => {
    setTitle('Resource Manager');
  }, [setTitle]);

  return (
    <div className="space-y-6 pb-20">
      {/* Tabs Header */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex flex-wrap md:flex-nowrap gap-2">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'documents'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
        >
          <FileText size={18} />
          <span>Documents</span>
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'subscriptions'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
        >
          <CreditCard size={18} />
          <span>Subscriptions</span>
        </button>
        <button
          onClick={() => setActiveTab('bg')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'bg'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
        >
          <CreditCard size={18} />
          <span>BG</span>
        </button>
        <button
          onClick={() => setActiveTab('insurance')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'insurance'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
        >
          <Shield size={18} />
          <span>Insurance</span>
        </button>
        <button
          onClick={() => setActiveTab('propertytax')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'propertytax'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
        >
          <Landmark size={18} />
          <span>Property Tax</span>
        </button>
        <button
          onClick={() => setActiveTab('emailrenewal')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'emailrenewal'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
        >
          <Mail size={18} />
          <span>Email Renewal</span>
        </button>
        <button
          onClick={() => setActiveTab('projectdocuments')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'projectdocuments'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
        >
          <FolderOpen size={18} />
          <span>Project Documents</span>
        </button>
      </div>

      {/* Project Documents Sub-tabs */}
      {activeTab === 'projectdocuments' && (
        <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 flex gap-2">
          <button
            onClick={() => setActiveProjectSubTab('workorders')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${activeProjectSubTab === 'workorders'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
          >
            Work Orders
          </button>
          <button
            onClick={() => setActiveProjectSubTab('tenders')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${activeProjectSubTab === 'tenders'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
          >
            Tenders
          </button>
          <button
            onClick={() => setActiveProjectSubTab('testreports')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${activeProjectSubTab === 'testreports'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
          >
            Test Reports
          </button>
          <button
            onClick={() => setActiveProjectSubTab('experiencecertificates')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${activeProjectSubTab === 'experiencecertificates'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
          >
            Experience Certificates
          </button>
        </div>
      )}

      {/* Insurance Sub-tabs */}
      {activeTab === 'insurance' && (
        <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 flex gap-2">
          <button
            onClick={() => setActiveInsuranceSubTab('vehicle')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${activeInsuranceSubTab === 'vehicle'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
          >
            Vehicle Insurance
          </button>
          <button
            onClick={() => setActiveInsuranceSubTab('health')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${activeInsuranceSubTab === 'health'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
          >
            Health Insurance
          </button>
          <button
            onClick={() => setActiveInsuranceSubTab('life')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${activeInsuranceSubTab === 'life'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
          >
            Life Insurance
          </button>
          <button
            onClick={() => setActiveInsuranceSubTab('general')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${activeInsuranceSubTab === 'general'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
          >
            General Insurance
          </button>
        </div>
      )}

      {/* General Insurance Dropdown */}
      {activeTab === 'insurance' && activeInsuranceSubTab === 'general' && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              General Insurance Type
            </label>
            <p className="text-xs text-gray-400">Select a general insurance category to view details</p>
          </div>
          <div className="relative min-w-[240px]">
            <select
              value={activeGeneralSubTab}
              onChange={(e) => setActiveGeneralSubTab(e.target.value as any)}
              className="appearance-none w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer hover:bg-gray-100 transition-colors shadow-sm"
            >
              <option value="building">Building</option>
              <option value="workman">Employee's Compensation</option>
              <option value="staff">Company Staff</option>
              <option value="construction">Construction</option>
              <option value="complex">Akashdeep Complex</option>
              <option value="fire">Fire Policy</option>
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Test Reports Dropdown */}
      {activeTab === 'projectdocuments' && activeProjectSubTab === 'testreports' && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Test Report Category
            </label>
            <p className="text-xs text-gray-400">Select a test report category to view details</p>
          </div>
          <div className="relative min-w-[240px]">
            <select
              value={activeTestReportSubTab}
              onChange={(e) => setActiveTestReportSubTab(e.target.value as any)}
              className="appearance-none w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer hover:bg-gray-100 transition-colors shadow-sm"
            >
              <option value="hls">HLS</option>
              <option value="pump">Pump</option>
              <option value="pannel">Pannel</option>
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Experience Certificates Dropdown */}
      {activeTab === 'projectdocuments' && activeProjectSubTab === 'experiencecertificates' && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Experience Certificate Category
            </label>
            <p className="text-xs text-gray-400">Select an experience certificate category to view details</p>
          </div>
          <div className="relative min-w-[240px]">
            <select
              value={activeExperienceSubTab}
              onChange={(e) => setActiveExperienceSubTab(e.target.value as any)}
              className="appearance-none w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer hover:bg-gray-100 transition-colors shadow-sm"
            >
              <option value="pump">Pump</option>
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'documents' ? (
          <div>
            <AllDocuments />
          </div>
        ) : activeTab === 'subscriptions' ? (
          <div>
            <AllSubscriptions />
          </div>
        ) : activeTab === 'bg' ? (
          <div>
            <AllBG />
          </div>
        ) : activeTab === 'insurance' ? (
          <div>
            {activeInsuranceSubTab === 'vehicle' && <VehicleInsurance />}
            {activeInsuranceSubTab === 'health' && <HealthInsurance />}
            {activeInsuranceSubTab === 'life' && <LifeInsurance />}
            {activeInsuranceSubTab === 'general' && (
              <>
                {activeGeneralSubTab === 'building' && <Building />}
                {activeGeneralSubTab === 'workman' && <WorkManCompensation />}
                {activeGeneralSubTab === 'staff' && <CompanyStaff />}
                {activeGeneralSubTab === 'construction' && <Construction />}
                {activeGeneralSubTab === 'complex' && <AkashdeepComplex />}
                {activeGeneralSubTab === 'fire' && <FirePolicy />}
              </>
            )}
          </div>
        ) : activeTab === 'propertytax' ? (
          <div>
            <PropertyTax />
          </div>
        ) : activeTab === 'emailrenewal' ? (
          <div>
            <EmailRenewal />
          </div>
        ) : (
          <div>
            {activeProjectSubTab === 'workorders' && <WorkOrders />}
            {activeProjectSubTab === 'tenders' && <Tenders />}
            {activeProjectSubTab === 'testreports' && (
              <>
                {activeTestReportSubTab === 'hls' && <HlsTestReports />}
                {activeTestReportSubTab === 'pump' && <PumpTestReports />}
                {activeTestReportSubTab === 'pannel' && <PannelTestReports />}
              </>
            )}
            {activeProjectSubTab === 'experiencecertificates' && (
              <>
                {activeExperienceSubTab === 'pump' && <PumpExperience />}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceManager;
