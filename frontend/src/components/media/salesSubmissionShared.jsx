import React from 'react';
import { formatDate, isVendorSubmission, projectDisplay } from './salesSubmissionUtils';

export const DetailRow = ({ label, value }) => (
  !value ? null : (
    <div className="flex items-start justify-between gap-3 py-1.5 text-xs">
      <span className="font-bold text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="max-w-[65%] text-right text-neutral-800 dark:text-neutral-100">{value}</span>
    </div>
  )
);

const phoneDisplay = (submission) =>
  submission.phones?.length ? submission.phones.join(', ') : submission.phone;

const productCategoryDisplay = (submission) =>
  submission.productCategories?.length ? submission.productCategories.join(', ') : submission.productCategory;

const brandNamesDisplay = (submission) => submission.brandNames?.length ? submission.brandNames.join(', ') : '';

export const SubmissionDetailModal = ({ submission, onClose }) => {
  if (!submission) return null;
  const vendorForm = isVendorSubmission(submission);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-neutral-900" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h2 className="text-sm font-black text-neutral-900 dark:text-neutral-100">
              {submission.businessName || submission.buyerName || 'Submission'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {[projectDisplay(submission), submission.buyerCategory].filter(Boolean).join(' - ')}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <span className="material-symbols-outlined text-neutral-400">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {submission.images?.length > 0 && (
            <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {submission.images.map((img, i) => (
                <a key={i} href={img.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <img src={img.url} alt={img.name || `image-${i}`} className="h-16 w-full object-cover" />
                </a>
              ))}
            </div>
          )}

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            <DetailRow label="Contact Person" value={submission.buyerName} />
            <DetailRow label="Product Name" value={projectDisplay(submission)} />
            <DetailRow label="Phone" value={phoneDisplay(submission)} />
            <DetailRow label="Email" value={submission.email} />
            <DetailRow label="Location" value={submission.location} />
            <DetailRow label="City" value={submission.city} />
            <DetailRow label="State" value={submission.state} />
            {vendorForm && (
              <>
                <DetailRow label="GST Number" value={submission.gstNumber} />
                <DetailRow label="Website" value={submission.website} />
                <DetailRow label="Product Category" value={productCategoryDisplay(submission)} />
                <DetailRow label="Quality Rating" value={submission.qualityRating ? `${submission.qualityRating}/5` : ''} />
                <DetailRow label="MOQ" value={submission.moq} />
                <DetailRow label="Price Range" value={submission.priceRange} />
                <DetailRow label="Lead Time" value={submission.leadTime} />
                <DetailRow label="Payment Terms" value={submission.paymentTerms} />
                <DetailRow label="Brand Name(s)" value={brandNamesDisplay(submission)} />
                <DetailRow label="Brand Section" value={submission.brandSection} />
                <DetailRow label="Online Collaboration" value={submission.onlineCollaboration} />
              </>
            )}
            <DetailRow label="Notes" value={submission.notes} />
            <DetailRow label="Submitted On" value={formatDate(submission.createdAt)} />
            <DetailRow label="Last Updated" value={formatDate(submission.updatedAt)} />
          </div>

          {submission.answers?.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-black text-neutral-700 dark:text-neutral-300">Assessment answers</p>
              {submission.answers.map((a, i) => (
                <div key={i} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-800">
                  <p className="font-bold text-neutral-800 dark:text-neutral-100">{a.question}</p>
                  <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">{a.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
