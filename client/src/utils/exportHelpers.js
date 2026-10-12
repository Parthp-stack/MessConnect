/**
 * Client-Side CSV and Excel Export Utilities for MessConnect
 * Supports instant in-browser downloads with zero dependencies.
 * Uses UTF-8 BOM so Indian currency symbols (₹) and Marathi/Hindi/English strings open cleanly in Excel.
 */

// Helper to escape CSV values
export const escapeCSV = (val) => {
  if (val === null || val === undefined) return '';
  let str = '';
  if (val instanceof Date) {
    str = val.toISOString();
  } else if (typeof val === 'object') {
    try {
      str = JSON.stringify(val);
    } catch {
      str = String(val);
    }
  } else {
    str = String(val);
  }

  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Trigger browser download from blob or string
export const triggerDownload = (content, filename, mimeType = 'text/csv;charset=utf-8;') => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Export rows to CSV
export const exportRowsToCSV = (filename, rows, columns = null) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    let emptyHeader = '';
    if (Array.isArray(columns) && columns.length > 0) {
      emptyHeader = columns.map(c => (typeof c === 'string' ? c : c.field || c.name || '')).join(',');
    }
    triggerDownload('\uFEFF' + emptyHeader, filename.endsWith('.csv') ? filename : `${filename}.csv`);
    return;
  }

  let colKeys = [];
  if (Array.isArray(columns) && columns.length > 0) {
    colKeys = columns.map(c => (typeof c === 'string' ? c : c.field || c.name || String(c)));
  } else {
    const keySet = new Set();
    rows.forEach(r => {
      if (r && typeof r === 'object') {
        Object.keys(r).forEach(k => keySet.add(k));
      }
    });
    colKeys = Array.from(keySet);
  }

  const headerLine = colKeys.map(escapeCSV).join(',');
  const lines = rows.map(r => colKeys.map(k => escapeCSV(r ? r[k] : '')).join(','));
  const csv = '\uFEFF' + [headerLine, ...lines].join('\r\n');

  triggerDownload(csv, filename.endsWith('.csv') ? filename : `${filename}.csv`, 'text/csv;charset=utf-8;');
};

// Escape for XML
const escapeXML = (val) => {
  if (val === null || val === undefined) return '';
  let str = '';
  if (val instanceof Date) {
    str = val.toISOString();
  } else if (typeof val === 'object') {
    try {
      str = JSON.stringify(val);
    } catch {
      str = String(val);
    }
  } else {
    str = String(val);
  }

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
};

// Export rows to SpreadsheetML Excel XML (.xls)
export const exportRowsToExcel = (filename, sheetName, rows, columns = null) => {
  const safeName = (sheetName || 'Data').replace(/[:\\/?*\[\]]/g, '_').substring(0, 31);
  const safeRows = Array.isArray(rows) ? rows : [];

  let colKeys = [];
  if (Array.isArray(columns) && columns.length > 0) {
    colKeys = columns.map(c => (typeof c === 'string' ? c : c.field || c.name || String(c)));
  } else if (safeRows.length > 0) {
    const keySet = new Set();
    safeRows.forEach(r => {
      if (r && typeof r === 'object') {
        Object.keys(r).forEach(k => keySet.add(k));
      }
    });
    colKeys = Array.from(keySet);
  }

  const headerCells = colKeys.map(k => `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXML(k)}</Data></Cell>`).join('\n');
  const headerRow = `   <Row ss:StyleID="HeaderRow">\n${headerCells}\n   </Row>`;

  const dataRows = safeRows.map(r => {
    const cells = colKeys.map(k => {
      const val = r ? r[k] : '';
      if (val === null || val === undefined || val === '') {
        return '    <Cell><Data ss:Type="String"></Data></Cell>';
      }
      if (typeof val === 'number') {
        return `    <Cell><Data ss:Type="Number">${val}</Data></Cell>`;
      }
      if (typeof val === 'boolean') {
        return `    <Cell><Data ss:Type="String">${val ? 'TRUE' : 'FALSE'}</Data></Cell>`;
      }
      return `    <Cell><Data ss:Type="String">${escapeXML(val)}</Data></Cell>`;
    }).join('\n');
    return `   <Row>\n${cells}\n   </Row>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>MessConnect Admin Portal</Author>
  <Created>${new Date().toISOString()}</Created>
  <Company>MessConnect Platform</Company>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#0F172A"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderRow">
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXML(safeName)}">
  <Table ss:DefaultRowHeight="20">
${headerRow}
${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;

  triggerDownload(xml, filename.endsWith('.xls') ? filename : `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
};

// Export multiple sheets into single Excel workbook
export const exportMultiSheetExcel = (filename, sheets) => {
  const safeSheets = Array.isArray(sheets) ? sheets : [sheets];

  const xmlSheets = safeSheets.map(s => {
    const safeName = (s.name || 'Sheet').replace(/[:\\/?*\[\]]/g, '_').substring(0, 31);
    const rows = Array.isArray(s.rows) ? s.rows : [];

    let colKeys = [];
    if (Array.isArray(s.columns) && s.columns.length > 0) {
      colKeys = s.columns.map(c => (typeof c === 'string' ? c : c.field || c.name || String(c)));
    } else if (rows.length > 0) {
      const keySet = new Set();
      rows.forEach(r => {
        if (r && typeof r === 'object') {
          Object.keys(r).forEach(k => keySet.add(k));
        }
      });
      colKeys = Array.from(keySet);
    }

    const headerCells = colKeys.map(k => `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXML(k)}</Data></Cell>`).join('\n');
    const headerRow = `   <Row ss:StyleID="HeaderRow">\n${headerCells}\n   </Row>`;

    const dataRows = rows.map(r => {
      const cells = colKeys.map(k => {
        const val = r ? r[k] : '';
        if (val === null || val === undefined || val === '') {
          return '    <Cell><Data ss:Type="String"></Data></Cell>';
        }
        if (typeof val === 'number') {
          return `    <Cell><Data ss:Type="Number">${val}</Data></Cell>`;
        }
        if (typeof val === 'boolean') {
          return `    <Cell><Data ss:Type="String">${val ? 'TRUE' : 'FALSE'}</Data></Cell>`;
        }
        return `    <Cell><Data ss:Type="String">${escapeXML(val)}</Data></Cell>`;
      }).join('\n');
      return `   <Row>\n${cells}\n   </Row>`;
    }).join('\n');

    return ` <Worksheet ss:Name="${escapeXML(safeName)}">
  <Table ss:DefaultRowHeight="20">
${headerRow}
${dataRows}
  </Table>
 </Worksheet>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>MessConnect Admin Portal</Author>
  <Created>${new Date().toISOString()}</Created>
  <Company>MessConnect Platform</Company>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#0F172A"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderRow">
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
  </Style>
 </Styles>
${xmlSheets}
</Workbook>`;

  triggerDownload(xml, filename.endsWith('.xls') ? filename : `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
};
