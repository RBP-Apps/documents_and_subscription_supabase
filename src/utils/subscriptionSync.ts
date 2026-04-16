import { SubscriptionItem } from "../store/dataStore";
import supabase from "./supabase";

export const syncSubscriptions = async (): Promise<SubscriptionItem[]> => {
    // Fetch from create_subscription (which now holds all columns)
    const { data: subs, error: subError } = await supabase
        .from('create_subscription')
        .select('*');

    if (subError) throw new Error(subError.message || "Failed to fetch subscriptions");

    // We can also fetch APPROVAL logs if we want to show the latest approval remark, etc. 
    // But since the status is now directly in create_subscription, we just use it directly.
    const { data: apps, error: appError } = await supabase
        .from('APPROVAL')
        .select('subscription_no, created_at, note')
        .order('created_at', { ascending: false });

    if (appError) throw new Error(appError.message || "Failed to fetch approvals");

    const approvalMap = new Map();
    if (apps) {
        apps.forEach((row: any) => {
            if (row.subscription_no && !approvalMap.has(row.subscription_no)) {
                approvalMap.set(row.subscription_no, { date: row.created_at, note: row.note });
            }
        });
    }

    const subscriptionList: SubscriptionItem[] = (subs || []).map((row: any, index: number) => {
        let sn = row.serial_no || '';

        // Determine Status based on workflow columns
        let computedStatus = 'Pending';
        if (row.actual_3) {
            computedStatus = 'Paid';
        } else if (row.approval_status && row.approval_status.toLowerCase() === 'approved') {
            computedStatus = 'Approved';
        } else if (row.approval_status && row.approval_status.toLowerCase() === 'rejected') {
            computedStatus = 'Rejected';
        } else if (row.actual_2) {
            computedStatus = 'Approved'; // fallback if no explicit status but actual_2 is filled
        }

        const approval = approvalMap.get(sn);

        return {
            id: row.id ? row.id.toString() : `sub-${sn}-${index}`,
            sn: sn,
            // Format timestamp neatly
            requestedDate: row.created_at || row.timestamp || '',
            companyName: row.company_name || 'N/A',
            subscriberName: row.subscriber_name || 'N/A',
            subscriptionName: row.subscription_name || 'N/A',
            price: row.price ? row.price.toString() : 'N/A',
            frequency: row.frequency || 'N/A',
            purpose: row.purpose || 'N/A',
            status: computedStatus,
            startDate: row.start_date || '', 
            endDate: row.end_date || '',   
            paymentDate: row.actual_3 || '', 
            paymentMethod: '', 
            transactionId: row.time_delay_3 ? row.time_delay_3.toString() : '', 
            paymentFile: row.document_copy || '', 
            approvalDate: approval?.date || '',
            remarks: '',
            actual2: row.actual_2 || '',
            actual3: row.actual_3 || '',
            planned3: row.planned_3 || '',
            renewalStatus: row.renewal_status || '',
            planned1: row.planned_1 || '',
            planned2: row.planned_2 || '',
            actual1: row.actual_1 || '',
            renewalCount: row.renewal_count ? row.renewal_count.toString() : '0'
        };
    });

    return subscriptionList;
};
