/**
 * Legal Document Generator
 * Generates PDF legal documents using Claude API
 */

import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import { callClaudeWithLogging } from './audit.js';

// Document types that can be generated
const DOCUMENT_TYPES = [
    'demand_letter',
    'cease_desist',
    'complaint',
    'motion_dismiss',
    'settlement_offer',
    'invoice',
    'retainer_agreement',
    'deposition_summary'
];

// Document type display names
const DOCUMENT_TYPE_NAMES = {
    demand_letter: 'Demand Letter',
    cease_desist: 'Cease and Desist Letter',
    complaint: 'Complaint Filing',
    motion_dismiss: 'Motion to Dismiss',
    settlement_offer: 'Settlement Offer',
    invoice: 'Legal Invoice',
    retainer_agreement: 'Retainer Agreement',
    deposition_summary: 'Deposition Summary'
};

/**
 * Get a random document type
 * @returns {string} Document type key
 */
export function getRandomDocumentType() {
    return DOCUMENT_TYPES[Math.floor(Math.random() * DOCUMENT_TYPES.length)];
}

/**
 * Build prompt for generating legal document content
 * @param {string} docType - Document type
 * @param {Object} matter - Matter data
 * @param {number} spiceLevel - Spice level 1-8
 * @returns {string} Prompt for Claude
 */
function buildDocumentPrompt(docType, matter, spiceLevel = 1) {
    const docName = DOCUMENT_TYPE_NAMES[docType];

    const spiceInstructions = {
        1: 'Write in a professional, straightforward legal tone. Use standard legal terminology and formatting.',
        2: 'Write professionally with subtle dry humor woven into the legal language.',
        3: 'Write with witty observations and clever legal wordplay while maintaining professional structure.',
        4: 'Write dramatically with heightened stakes. The matter is of GRAVE importance.',
        5: 'Write unhinged but technically valid legal content. Escalate the absurdity.',
        6: 'CHAOTIC EVIL mode: Maximum passive-aggressive legalese. Malicious compliance. Footnotes that mock.',
        7: 'ELDRITCH HORROR: The document should hint at cosmic implications. Reference impossible geometries. The exhibits have begun whispering.',
        8: 'THE FINAL FORM: Complete transcendent chaos. Time paradoxes. Sentient precedents. The court reporter is having an existential crisis. This document should not be admissible in any court in any dimension, yet somehow it is.'
    };

    const instruction = spiceInstructions[spiceLevel] || spiceInstructions[1];

    const basePrompt = `Generate the full text content of a ${docName} for a legal matter.

MATTER DETAILS:
- Description: ${matter.note || 'Legal matter requiring attention'}
- Date: ${matter.matter_date || 'Current date'}
- Cost: $${(matter.cost || 0).toFixed(2)}

TONE INSTRUCTIONS:
${instruction}

DOCUMENT REQUIREMENTS:
1. Include appropriate court/legal headers with case number (make up a realistic one)
2. Include party names and addresses (make up realistic names)
3. Full body text with proper legal structure
4. Signature blocks and dates
5. Any relevant exhibits or attachments should be mentioned but not included

FORMAT:
Return ONLY the document text content. Do not include markdown formatting. Use plain text with appropriate spacing and indentation. The text will be converted to PDF.

Generate the complete ${docName}:`;

    return basePrompt;
}

/**
 * Generate legal document content using Claude API
 * @param {Object} client - Anthropic client
 * @param {string} model - Model ID
 * @param {string} docType - Document type
 * @param {Object} matter - Matter data
 * @param {number} spiceLevel - Spice level 1-8
 * @param {Object} [context] - User context for logging
 * @returns {Promise<string>} Generated document content
 */
export async function generateDocumentContent(client, model, docType, matter, spiceLevel = 1, context = {}) {
    const prompt = buildDocumentPrompt(docType, matter, spiceLevel);

    const response = await callClaudeWithLogging(client, {
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
    }, context);

    const content = response.content?.[0]?.text;
    if (!content) {
        throw new Error('No content generated');
    }

    return content;
}

/**
 * Convert text content to PDF buffer
 * @param {string} content - Document text content
 * @param {string} docType - Document type
 * @param {Object} matter - Matter data
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function textToPdf(content, docType, matter) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'LETTER',
            margins: {
                top: 72,    // 1 inch
                bottom: 72,
                left: 72,
                right: 72
            }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add header
        const docName = DOCUMENT_TYPE_NAMES[docType] || 'Legal Document';
        doc.fontSize(10)
            .font('Courier')
            .text(`Matter ID: ${matter.id || 'N/A'}`, { align: 'right' })
            .text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'right' })
            .moveDown(2);

        // Document title
        doc.fontSize(14)
            .font('Helvetica-Bold')
            .text(docName.toUpperCase(), { align: 'center' })
            .moveDown(2);

        // Document content
        doc.fontSize(11)
            .font('Courier');

        // Split content into paragraphs and render
        const paragraphs = content.split('\n\n');
        for (const para of paragraphs) {
            if (para.trim()) {
                // Check if it looks like a header/title (all caps or short)
                const isHeader = para.length < 60 && (para === para.toUpperCase() || para.match(/^[A-Z][A-Z\s\d\.]+$/));

                if (isHeader) {
                    doc.font('Helvetica-Bold')
                        .text(para.trim())
                        .font('Courier');
                } else {
                    // Handle single line breaks within paragraph
                    const lines = para.split('\n');
                    for (const line of lines) {
                        doc.text(line.trim());
                    }
                }
                doc.moveDown();
            }
        }

        // Add footer
        doc.moveDown(2);
        doc.fontSize(8)
            .font('Helvetica')
            .fillColor('#666666')
            .text('---', { align: 'center' })
            .text('This document was generated for demonstration purposes.', { align: 'center' });

        doc.end();
    });
}

/**
 * Generate a complete legal document (content + PDF)
 * @param {Object} client - Anthropic client
 * @param {string} model - Model ID
 * @param {Object} matter - Matter data
 * @param {number} spiceLevel - Spice level 1-8
 * @param {Object} [context] - User context for logging
 * @returns {Promise<{ buffer: Buffer, filename: string, contentType: string, docType: string }>}
 */
export async function generateLegalDocument(client, model, matter, spiceLevel = 1, context = {}) {
    const docType = getRandomDocumentType();
    const docName = DOCUMENT_TYPE_NAMES[docType];

    // Generate content using Claude
    const content = await generateDocumentContent(client, model, docType, matter, spiceLevel, context);

    // Convert to PDF
    const buffer = await textToPdf(content, docType, matter);

    // Generate filename
    const sanitizedNote = (matter.note || 'document')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 30);
    const filename = `${docType}_${sanitizedNote}_${Date.now()}.pdf`;

    return {
        buffer,
        filename,
        contentType: 'application/pdf',
        docType,
        docName
    };
}

/**
 * Generate a fallback/placeholder PDF when Claude is not available
 * @param {Object} matter - Matter data
 * @returns {Promise<{ buffer: Buffer, filename: string, contentType: string }>}
 */
export async function generatePlaceholderDocument(matter) {
    const docType = getRandomDocumentType();
    const docName = DOCUMENT_TYPE_NAMES[docType];

    const content = `
${docName.toUpperCase()}

CASE NO: ${Math.floor(Math.random() * 900000 + 100000)}-CV

IN THE MATTER OF:
Legal Matter #${matter.id || 'N/A'}

DATE: ${new Date().toLocaleDateString()}


TO WHOM IT MAY CONCERN:

This is a placeholder document generated for demonstration purposes.

Matter Description: ${matter.note || 'No description provided'}
Matter Date: ${matter.matter_date || 'Not specified'}
Associated Cost: $${(matter.cost || 0).toFixed(2)}

This document serves as a template attachment for the legal tracking system.
In a production environment, this would contain actual legal content
generated based on the matter details and document type.


PLACEHOLDER CONTENT SECTION

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.


CONCLUSION

This placeholder document has been generated automatically.


Respectfully submitted,

_______________________
[Signature]

_______________________
[Date]
    `.trim();

    const buffer = await textToPdf(content, docType, matter);

    const filename = `placeholder_${docType}_${Date.now()}.pdf`;

    return {
        buffer,
        filename,
        contentType: 'application/pdf',
        docType,
        docName
    };
}

export { DOCUMENT_TYPES, DOCUMENT_TYPE_NAMES };
