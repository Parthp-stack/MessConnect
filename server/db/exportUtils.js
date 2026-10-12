/**
 * Database Export Utilities for MessConnect
 * Supports CSV (with UTF-8 BOM for Excel compatibility) and SpreadsheetML Excel (.xls)
 * Zero external dependencies.
 */

// Friendly Table Metadata
const TABLE_METADATA = {
  users: {
    displayName: 'Users & Accounts',
    description: 'Registered students, mess owners, and platform administrators',
    primaryKey: 'id',
    icon: 'Users'
  },
  messes: {
    displayName: 'Mess Kitchen Partners',
    description: 'Verified dining kitchens, menus, timings, and campus locations',
    primaryKey: 'id',
    icon: 'Store'
  },
  subscriptions: {
    displayName: 'Student Subscriptions',
    description: 'Active, paused, and expired student dining subscriptions with payment breakdown',
    primaryKey: 'id',
    icon: 'FileText'
  },
  payments: {
    displayName: 'Payment Transactions',
    description: 'UPI and gateway payment logs, transaction IDs, amounts, and statuses',
    primaryKey: 'id',
    icon: 'IndianRupee'
  },
  checkins: {
    displayName: 'Daily Meal Attendance',
    description: 'QR scan and 4-digit token check-in logs for breakfast, lunch, and dinner',
    primaryKey: 'id',
    icon: 'CheckCircle'
  },
  complaints: {
    displayName: 'Grievances & Support Tickets',
    description: 'Student and mess complaints, audit reviews, and admin resolution logs',
    primaryKey: 'id',
    icon: 'AlertCircle'
  },
  offers: {
    displayName: 'Discount Offers & Coupons',
    description: 'Mess-specific and platform discount codes and promo banners',
    primaryKey: 'id',
    icon: 'Sparkles'
  },
  flexipass_tiers: {
    displayName: 'FlexiPass Plan Tiers',
    description: 'Multi-mess credit bundles and campus cluster dining plans',
    primaryKey: 'id',
    icon: 'BarChart3'
  },
  flexipasses: {
    displayName: 'Active FlexiPasses',
    description: 'Student flexipass balances, remaining meal credits, and validity',
    primaryKey: 'id',
    icon: 'ShieldCheck'
  },
  reviews: {
    displayName: 'Ratings & Reviews',
    description: 'Student hygiene, taste, portion ratings, and mess owner responses',
    primaryKey: 'id',
    icon: 'Star'
  },
  notifications: {
    displayName: 'System Notifications',
    description: 'In-app, SMS, and email alerts dispatched across the platform',
    primaryKey: 'id',
    icon: 'MessageSquare'
  },
  groups: {
    displayName: 'Roommate Groups',
    description: 'Shared student meal pooling and roommate group codes',
    primaryKey: 'id',
    icon: 'Users'
  },
  favorites: {
    displayName: 'Student Favorites',
    description: 'Bookmarked mess kitchens per student account',
    primaryKey: 'id',
    icon: 'Star'
  },
  search_history: {
    displayName: 'Campus Search History',
    description: 'Student search keywords and campus locality queries',
    primaryKey: 'id',
    icon: 'Search'
  },
  trials: {
    displayName: 'Meal Trials',
    description: 'Pre-subscription single meal trials booked by students',
    primaryKey: 'id',
    icon: 'Check'
  },
  announcements: {
    displayName: 'Platform & Mess Announcements',
    description: 'Broadcast notifications and alerts sent to students or mess owners',
    primaryKey: 'id',
    icon: 'Megaphone'
  },
  db_meta: {
    displayName: 'Database Metadata',
    description: 'Migration flags, schema versions, and backup snapshots',
    primaryKey: 'meta_key',
    icon: 'Sliders'
  }
};

/**
 * Escapes a single cell value for CSV output
 */
function escapeCSV(val) {
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

  // If contains delimiter, quote, or newline, escape quotes and wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts array of rows into a UTF-8 BOM CSV string
 */
function rowsToCSV(rows, columns = null) {
  if (!Array.isArray(rows) || rows.length === 0) {
    if (Array.isArray(columns) && columns.length > 0) {
      const colNames = columns.map(c => (typeof c === 'string' ? c : c.field || c.name || String(c)));
      return '\uFEFF' + colNames.map(escapeCSV).join(',') + '\r\n';
    }
    return '\uFEFF';
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
  const lines = rows.map(row => {
    return colKeys.map(k => escapeCSV(row ? row[k] : '')).join(',');
  });

  // Prepend UTF-8 BOM (\uFEFF) so Excel respects UTF-8 encoding (e.g. ₹ symbol, names)
  return '\uFEFF' + [headerLine, ...lines].join('\r\n');
}

/**
 * Escapes text for XML attribute / node content
 */
function escapeXML(val) {
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
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // strip invalid XML control characters
}

/**
 * Sanitizes worksheet name for Excel (max 31 chars, no special characters like : \ / ? * [ ])
 */
function sanitizeSheetName(name) {
  if (!name) return 'Sheet';
  return name.replace(/[:\\/?*\[\]]/g, '_').substring(0, 31);
}

/**
 * Generates an Excel SpreadsheetML XML string with one or multiple worksheets
 * @param {Array<{ name: string, rows: Array<object>, columns?: Array<any> }>} sheets
 */
function workbookToExcelXML(sheets) {
  const safeSheets = Array.isArray(sheets) ? sheets : [sheets];

  const xmlSheets = safeSheets.map(sheet => {
    const sheetName = sanitizeSheetName(sheet.name || 'Data');
    const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
    
    let colKeys = [];
    if (Array.isArray(sheet.columns) && sheet.columns.length > 0) {
      colKeys = sheet.columns.map(c => (typeof c === 'string' ? c : c.field || c.name || String(c)));
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

    return ` <Worksheet ss:Name="${escapeXML(sheetName)}">
  <Table ss:DefaultRowHeight="20">
${headerRow}
${dataRows}
  </Table>
 </Worksheet>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>MessConnect Admin Portal</Author>
  <Created>${new Date().toISOString()}</Created>
  <Company>MessConnect Platform Inc.</Company>
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
}

module.exports = {
  TABLE_METADATA,
  escapeCSV,
  rowsToCSV,
  escapeXML,
  workbookToExcelXML
};
