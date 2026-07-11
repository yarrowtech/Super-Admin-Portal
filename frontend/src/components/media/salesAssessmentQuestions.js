export const SALES_ASSESSMENT_QUESTIONS = [
  { question: 'What is your average monthly sales turnover?', options: ['Under ₹1 Lakh', '₹1–5 Lakhs', '₹5–10 Lakhs', '₹10–50 Lakhs', 'Above ₹50 Lakhs'] },
  { question: 'What is your current stock availability?', options: ['Under 100 Units', '100–500 Units', '500–1,000 Units', 'Above 1,000 Units'] },
  { question: 'Do you have a manufacturing factory?', options: ['Yes', 'No'] },
  { question: 'Do you have a warehouse/store?', options: ['Yes', 'No', 'Both Factory & Warehouse'] },
  { question: 'What is your production capacity per month?', options: ['Under 1,000 Units', '1,000–5,000 Units', '5,000–10,000 Units', 'Above 10,000 Units'] },
  { question: 'What is your current team strength?', options: ['1–10 Employees', '11–25 Employees', '26–50 Employees', '51–100 Employees', 'Above 100 Employees'] },
  { question: 'Do you have a dedicated sales team?', options: ['Yes', 'No'] },
  { question: 'Do you have a quality control (QC) team?', options: ['Yes', 'No'] },
  { question: 'Do you have an inventory/stock monitoring system?', options: ['Yes', 'No', 'Planning to Implement'] },
  { question: 'What are the biggest challenges in your business?', options: ['Stock Management', 'Production Delay', 'Logistics', 'Raw Material', 'Sales', 'Cash Flow', 'Customer Acquisition', 'Workforce'] },
  { question: 'Can you fulfill large-volume orders?', options: ['Yes', 'No', 'Depends on Quantity'] },
  { question: 'What is your average order fulfillment time?', options: ['Same Day', '1–3 Days', '4–7 Days', 'More than 7 Days'] },
  { question: 'Which areas do you currently supply?', options: ['Local', 'District', 'State', 'Pan India', 'International'] },
  { question: 'What support do you expect from us?', options: ['More Orders', 'Better Pricing', 'Marketing Support', 'Faster Payments', 'Logistics Support', 'Technology Integration', 'Dedicated Relationship Manager'] },
  { question: 'Additional Business Remarks', options: [] },
];

export const fallbackSalesAssessmentQuestions = () =>
  SALES_ASSESSMENT_QUESTIONS.map((question, index) => ({
    _id: `default-sales-assessment-${index}`,
    ...question,
  }));
