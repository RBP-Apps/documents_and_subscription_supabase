import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Share2, MessageCircle, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useDataStore from '../../store/dataStore';

import supabase from '../../utils/supabase';
import type { DocumentItem } from '../../store/dataStore';
import emailjs from "emailjs-com";
import { sendWhatsAppMessage } from '../../utils/whatsappService';
import { logWhatsApp } from '../../utils/whatsappLog';


interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'email' | 'whatsapp' | 'both' | null;
    documentId: string | null;
    documentName: string;
    fileContent?: string;
    document?: DocumentItem;
    isBatch?: boolean;
    batchDocuments?: DocumentItem[];
}

const ShareModal: React.FC<ShareModalProps> = ({
    isOpen,
    onClose,
    type,
    documentId,
    documentName,
    fileContent,
    document,
    isBatch = false,
    batchDocuments = []
}) => {
    const [recipientName, setRecipientName] = useState('');
    const [email, setEmail] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const { addShareHistory, shareHistory, documents } = useDataStore();

    // Add refs to track initial values
    const initialLoadRef = useRef(true);
    const prevIsOpenRef = useRef(isOpen);
    const prevDocumentNameRef = useRef(documentName);

    // Get document details if not provided directly
    const documentDetails = document || documents.find(d => d.id === documentId);

    useEffect(() => {
        // Only reset when modal opens, not when dependencies change
        if (isOpen && !prevIsOpenRef.current) {
            // Reset fields or prepopulate
            setRecipientName('');
            setEmail('');
            setWhatsapp('');

            // Only update subject if it's the initial load or documentName has actually changed
            const shouldUpdateSubject = initialLoadRef.current ||
                (documentName !== prevDocumentNameRef.current && !subject.trim());

            if (shouldUpdateSubject) {
                if (isBatch && batchDocuments.length > 0) {
                    setSubject(`Sharing ${batchDocuments.length} Documents`);
                    setMessage(`Please find the links for ${batchDocuments.length} shared documents. This link will expire in 7 days.`);
                } else {
                    setSubject(`Sharing Document: ${documentName}`);
                    setMessage(`Please find the link for the shared document: ${documentName}. This link will expire in 7 days.`);
                }
                prevDocumentNameRef.current = documentName;
            }

            setEmailSent(false);
            setIsSending(false);
            initialLoadRef.current = false;
        }

        prevIsOpenRef.current = isOpen;
    }, [isOpen]); // Only depend on isOpen

    
    // ============================================================
    const handleShareWhatsApp = async (): Promise<boolean> => {
        if (!whatsapp.trim()) {
            toast.error('Please enter WhatsApp number');
            return false;
        }

        // Format number: strip non-digits, prepend country code 91 if not present
        const rawDigits = whatsapp.replace(/\D/g, '');
        const to = rawDigits.startsWith('91') && rawDigits.length === 12
            ? rawDigits
            : `91${rawDigits}`;

        logWhatsApp('INFO', { action: 'WhatsApp send initiated', to, documentName });

        setIsSending(true);
        try {
            if (isBatch && batchDocuments.length > 0) {
                // Batch: send one message per document
                for (const doc of batchDocuments) {
                    const previewUrl = getPreviewUrl(doc.fileContent);
                    await sendWhatsAppMessage({
                        to,
                        name: recipientName || 'there',
                        documentName: doc.documentName,
                        category: doc.category || '',
                        company: doc.companyName || '',
                        type: doc.documentType || '',
                        link: previewUrl || 'N/A',
                    });
                }

                // Log batch to Supabase
                const logs = batchDocuments.map((doc) => ({
                    name: recipientName,
                    document_name: doc.documentName,
                    document_type: doc.documentType,
                    category: doc.category,
                    serial_no: doc.sn,
                    image: doc.fileContent,
                    share_method: 'WhatsApp',
                    number: whatsapp,
                    source_sheet: 'Documents',
                }));
                supabase.from('Shared_Documents').insert(logs).then(({ error }) => {
                    if (error) console.error('Error logging batch whatsapp share:', error);
                });

                logWhatsApp('BATCH_SENT', { count: batchDocuments.length, to });
                toast.success(`WhatsApp sent for ${batchDocuments.length} documents ✅`);

            } else if (documentDetails) {
                // Single document
                const previewUrl = getPreviewUrl(fileContent);
                await sendWhatsAppMessage({
                    to,
                    name: recipientName || 'there',
                    documentName: documentName,
                    category: documentDetails.category || '',
                    company: documentDetails.companyName || '',
                    type: documentDetails.documentType || '',
                    link: previewUrl || 'N/A',
                });

                // Log single to Supabase
                supabase.from('Shared_Documents').insert([{
                    name: recipientName,
                    document_name: documentName,
                    document_type: documentDetails.documentType,
                    category: documentDetails.category,
                    serial_no: documentDetails.sn,
                    image: fileContent,
                    share_method: 'WhatsApp',
                    number: whatsapp,
                    source_sheet: 'Documents',
                }]).then(({ error }) => {
                    if (error) console.error('Error logging whatsapp share:', error);
                });

                logWhatsApp('SENT', { documentName, to });
                toast.success('WhatsApp message sent successfully ✅');
            }

            return true;
        } catch (error: any) {
            logWhatsApp('ERROR', { message: error?.message, error });
            toast.error(`WhatsApp failed: ${error?.message || 'Unknown error'} ❌`);
            return false;
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen || !type) return null;

    const getPreviewUrl = (url: string | undefined): string => {
        if (!url) return '';
        if (url.includes("drive.google.com")) {
            let fileId = null;
            const viewMatch = url.match(/\/file\/d\/([^/]+)/);
            if (viewMatch) {
                fileId = viewMatch[1];
            } else {
                const openMatch = url.match(/[?&]id=([^&]+)/);
                if (openMatch) {
                    fileId = openMatch[1];
                }
            }
            if (fileId) {
                return `https://drive.google.com/file/d/${fileId}/preview`;
            }
        }
        return url;
    };



    const generateWhatsAppMessage = (): string => {
        let whatsappMessage = '';

        if (isBatch && batchDocuments.length > 0) {
            whatsappMessage = `📄 *Shared ${batchDocuments.length} Documents*\n\n`;

            batchDocuments.forEach((doc, index) => {
                whatsappMessage += `*${index + 1}. ${doc.documentName}*\n`;
                if (doc.sn) whatsappMessage += `📋 Serial No: ${doc.sn}\n`;
                if (doc.category) whatsappMessage += `🏷️ Category: ${doc.category}\n`;
                if (doc.companyName) whatsappMessage += `🏢 Company: ${doc.companyName}\n`;
                if (doc.documentType) whatsappMessage += `📄 Type: ${doc.documentType}\n`;
                if (doc.renewalDate) {
                    const date = new Date(doc.renewalDate);
                    whatsappMessage += `📅 Renewal Date: ${date instanceof Date && !isNaN(date.getTime()) ? date.toLocaleDateString() : doc.renewalDate}\n`;
                }
                if (doc.fileContent) {
                    const previewUrl = getPreviewUrl(doc.fileContent);
                    whatsappMessage += `🔗 Link: ${previewUrl}\n`;
                }
                whatsappMessage += `\n`;
            });
        } else {
            whatsappMessage = `📄 *Document Shared:* ${documentName}\n\n`;

            if (documentDetails) {
                if (documentDetails.sn) whatsappMessage += `📋 *Serial No:* ${documentDetails.sn}\n`;
                if (documentDetails.category) whatsappMessage += `🏷️ *Category:* ${documentDetails.category}\n`;
                if (documentDetails.companyName) whatsappMessage += `🏢 *Company:* ${documentDetails.companyName}\n`;
                if (documentDetails.documentType) whatsappMessage += `📄 *Type:* ${documentDetails.documentType}\n`;
                if (documentDetails.renewalDate) {
                    const date = new Date(documentDetails.renewalDate);
                    whatsappMessage += `📅 *Renewal Date:* ${date instanceof Date && !isNaN(date.getTime()) ? date.toLocaleDateString() : documentDetails.renewalDate}\n`;
                }
            }

            if (message) {
                whatsappMessage += `\n💬 *Message:* ${message}\n`;
            }

            if (fileContent) {
                const previewUrl = getPreviewUrl(fileContent);
                whatsappMessage += `\n🔗 *Document Link:* ${previewUrl}`;
            }
        }

        // Add expiry notice to WhatsApp message
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        whatsappMessage += `\n\n⏰ *Link Expiry:* This link will expire on ${expiryDate.toLocaleDateString()} (7 days from now)`;

        return whatsappMessage;
    };

    const handleSendEmail = async () => {
        if (!email.trim()) {
            toast.error("Please enter email");
            return false;
        }

        setIsSending(true);

        try {
            await emailjs.send(
                "service_mkdtlae",
                "template_1912vpj",
                {
                    recipient_name: recipientName,
                    email: email,
                    document_name: documentName,
                    category: documentDetails?.category || "",
                    document_type: documentDetails?.documentType || "",
                    document_link: fileContent || "",
                    message: message,

                    // ✅ ADD THESE
                    // serial_no: documentDetails?.sn || "",
                    serial_no: documentDetails?.sn || documentDetails?.serial_no || "",
                    company: documentDetails?.companyName || ""
                },
                "JN3T3k1LsQ0KSOn-A"
            );

            toast.success("Email sent successfully ✅");
            setEmailSent(true);

            // Log the Email sharing activity to Supabase
            if (isBatch && batchDocuments.length > 0) {
                const logs = batchDocuments.map((doc) => ({
                    name: recipientName,
                    email: email,
                    document_name: doc.documentName,
                    document_type: doc.documentType,
                    category: doc.category,
                    serial_no: doc.sn,
                    image: doc.fileContent,
                    share_method: 'Email',
                    source_sheet: 'Documents'
                }));

                supabase.from('Shared_Documents').insert(logs).then(({ error }) => {
                    if (error) console.error("Error logging email share:", error);
                });
            } else {
                supabase.from('Shared_Documents').insert([{
                    name: recipientName,
                    email: email,
                    document_name: documentName,
                    document_type: documentDetails?.documentType,
                    category: documentDetails?.category,
                    serial_no: documentDetails?.sn || documentDetails?.serial_no,
                    image: fileContent,
                    share_method: 'Email',
                    source_sheet: 'Documents'
                }]).then(({ error }) => {
                    if (error) console.error("Error logging email share:", error);
                });
            }

            return true;

        } catch (error) {
            console.error(error);
            toast.error("Failed to send email ❌");
            return false;
        } finally {
            setIsSending(false);
        }
    };






    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();

        let emailSuccess = false;
        let whatsappOpened = false;

        // Handle email sending if applicable
        if (type === 'email' || type === 'both') {
            emailSuccess = await handleSendEmail();
            if (!emailSuccess && type === 'email') {
                return;
            }
        }

        // Handle WhatsApp if applicable — Meta API (async)
        if (type === 'whatsapp' || type === 'both') {
            const wpSuccess = await handleShareWhatsApp();
            whatsappOpened = wpSuccess;
            if (!wpSuccess && type === 'whatsapp') return;
        }

        // Add to share history
        if (emailSuccess || whatsappOpened || type === 'whatsapp') {
            const nextId = shareHistory.length + 1;

            if (isBatch && batchDocuments.length > 0) {
                // Add batch share history
                batchDocuments.forEach((doc, index) => {
                    if (type === 'email' || type === 'both') {
                        addShareHistory({
                            id: `share-${Date.now()}-${index}-email`,
                            shareNo: `SH-${String(nextId + index).padStart(3, '0')}`,
                            dateTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
                            docSerial: doc.sn || 'N/A',
                            docName: doc.documentName,
                            docFile: doc.fileContent || 'N/A',
                            sharedVia: 'Email',
                            recipientName: recipientName || 'N/A',
                            contactInfo: email
                        });
                    }

                    if (type === 'whatsapp' || type === 'both') {
                        addShareHistory({
                            id: `share-${Date.now()}-${index}-whatsapp`,
                            shareNo: `SH-${String(nextId + index + batchDocuments.length).padStart(3, '0')}`,
                            dateTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
                            docSerial: doc.sn || 'N/A',
                            docName: doc.documentName,
                            docFile: doc.fileContent || 'N/A',
                            sharedVia: 'WhatsApp',
                            recipientName: recipientName || 'N/A',
                            contactInfo: whatsapp
                        });
                    }
                });
            } else {
                // Single document share history
                if (type === 'both') {
                    addShareHistory({
                        id: `share-${Date.now()}-1`,
                        shareNo: `SH-${String(nextId).padStart(3, '0')}`,
                        dateTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
                        docSerial: documentDetails?.sn || 'N/A',
                        docName: documentName,
                        docFile: fileContent || 'N/A',
                        sharedVia: 'Email',
                        recipientName: recipientName || 'N/A',
                        contactInfo: email
                    });

                    addShareHistory({
                        id: `share-${Date.now()}-2`,
                        shareNo: `SH-${String(nextId + 1).padStart(3, '0')}`,
                        dateTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
                        docSerial: documentDetails?.sn || 'N/A',
                        docName: documentName,
                        docFile: fileContent || 'N/A',
                        sharedVia: 'WhatsApp',
                        recipientName: recipientName || 'N/A',
                        contactInfo: whatsapp
                    });
                } else {
                    addShareHistory({
                        id: `share-${Date.now()}`,
                        shareNo: `SH-${String(nextId).padStart(3, '0')}`,
                        dateTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
                        docSerial: documentDetails?.sn || 'N/A',
                        docName: documentName,
                        docFile: fileContent || 'N/A',
                        sharedVia: type === 'email' ? 'Email' : 'WhatsApp',
                        recipientName: recipientName || 'N/A',
                        contactInfo: type === 'email' ? email : whatsapp
                    });
                }
            }

            // Close modal after successful sharing
            if ((type === 'email' && emailSuccess) || (type === 'whatsapp' && whatsappOpened) || (type === 'both' && (emailSuccess || whatsappOpened))) {
                setTimeout(() => {
                    onClose();
                    // Reset form
                    setRecipientName('');
                    setEmail('');
                    setWhatsapp('');
                    setEmailSent(false);
                    initialLoadRef.current = true; // Reset for next opening
                }, 1500);
            }
        }
    };

    const isEmail = type === 'email' || type === 'both';
    const isWhatsapp = type === 'whatsapp' || type === 'both';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        {type === 'email' && <Mail className="text-blue-600" size={20} />}
                        {type === 'whatsapp' && <MessageCircle className="text-green-600" size={20} />}
                        {type === 'both' && <Share2 className="text-purple-600" size={20} />}
                        <h2 className="text-lg font-semibold text-gray-800">
                            {isBatch
                                ? `Share ${batchDocuments.length} Documents`
                                : type === 'email' ? 'Share via Email' :
                                    type === 'whatsapp' ? 'Share via WhatsApp' :
                                        'Share Options'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSending}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Document Selection (Read Only) */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                            {isBatch ? 'Documents' : 'Document'}
                        </label>
                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700 font-medium">
                            {isBatch ? (
                                <div>
                                    <p className="font-bold mb-2">Sharing {batchDocuments.length} documents:</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        {batchDocuments.map((doc, index) => (
                                            <li key={index} className="truncate">
                                                {index + 1}. {doc.documentName}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>📄</span>
                                    {documentName}
                                </div>
                            )}
                        </div>
                        {!isBatch && fileContent && (
                            <p className="text-xs text-gray-500 mt-1">
                                Document details and download link will be shared
                            </p>
                        )}
                        {isBatch && batchDocuments.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                                Document links will be shared in the email
                            </p>
                        )}
                    </div>

                    {isEmail && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Recipient Name
                                </label>
                                <input
                                    type="text"
                                    required={isEmail}
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Enter recipient name"
                                    disabled={isSending || emailSent}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required={isEmail}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="john@example.com"
                                    disabled={isSending || emailSent}
                                />
                            </div>
                        </>
                    )}

                    {isWhatsapp && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                WhatsApp Number
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 bg-gray-50 rounded-l-lg text-gray-500 text-sm">
                                    +91
                                </span>
                                <input
                                    type="tel"
                                    required={isWhatsapp}
                                    value={whatsapp}
                                    onChange={(e) => setWhatsapp(e.target.value)}
                                    className="flex-1 w-full px-3 py-2 border border-gray-200 rounded-r-lg focus:ring-2 focus:ring-green-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="98765 43210"
                                    disabled={isSending}
                                />
                            </div>
                        </div>
                    )}

                    {isEmail && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    required={isEmail}
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Enter email subject"
                                    disabled={isSending || emailSent}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Message
                                </label>
                                <textarea
                                    rows={3}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Add a message..."
                                    disabled={isSending || emailSent}
                                />
                            </div>
                        </>
                    )}

                    {/* Status Message */}
                    {emailSent && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-green-700">
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                    ✓
                                </div>
                                <span className="text-sm font-medium">
                                    {isBatch ? `Email with ${batchDocuments.length} documents sent successfully!` : 'Email sent successfully!'}
                                </span>
                            </div>
                            <p className="text-xs text-green-600 mt-1">
                                The shared link will expire in 7 days.
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSending}
                            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSending || (isEmail && emailSent)}
                            className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2
                                ${type === 'email' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : ''}
                                ${type === 'whatsapp' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : ''}
                                ${type === 'both' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : ''}
                                ${emailSent ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : ''}
                            `}
                        >
                            {isSending ? (
                                <>
                                    <Loader className="animate-spin" size={20} />
                                    Sending...
                                </>
                            ) : emailSent ? (
                                'Sent!'
                            ) : (
                                <>
                                    {type === 'email' && <Mail size={20} />}
                                    {type === 'whatsapp' && <MessageCircle size={20} />}
                                    {type === 'both' && <Share2 size={20} />}
                                    Share
                                    {type === 'email' && ' via Email'}
                                    {type === 'whatsapp' && ' via WhatsApp'}
                                    {type === 'both' && ' Options'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ShareModal;