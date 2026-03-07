import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function generateMockPDF() {
    const policiesDir = path.resolve(__dirname, '../../..', 'policies');
    const pdfPath = path.join(policiesDir, 'all-policies.pdf');

    if (fs.existsSync(pdfPath)) {
        console.log('✅ Mock PDF already exists!');
        return;
    }

    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(pdfPath);

    doc.pipe(writeStream);

    doc.fontSize(24).text('Company Policies Master Document', { align: 'center' });
    doc.moveDown(2);

    const files = fs.readdirSync(policiesDir).filter(f => f.endsWith('.txt'));

    for (const file of files) {
        const text = fs.readFileSync(path.join(policiesDir, file), 'utf-8');
        doc.fontSize(16).text(file.toUpperCase().replace('.TXT', ''), { underline: true });
        doc.moveDown(1);
        doc.fontSize(12).text(text);
        doc.moveDown(2);
    }

    doc.end();

    writeStream.on('finish', () => {
        console.log('📄 Generated mock PDF with all policies at:', pdfPath);
    });
}

generateMockPDF();
