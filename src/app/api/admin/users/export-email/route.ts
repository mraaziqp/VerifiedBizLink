import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';
import { sendWithFallback } from '@/lib/email';

const TARGET_EMAIL = 'info@verifiedbizlink.co.za';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden — Admins only' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const recipientEmail = (body.email || TARGET_EMAIL).trim().toLowerCase();

    // Fetch all users with business info
    const users = await db`
      SELECT
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.headline,
        u.email_verified,
        u.email_verified_at,
        u.is_suspended,
        u.created_at,
        b.company_name,
        b.industry,
        b.status AS business_status,
        b.package_type,
        b.trust_score
      FROM users u
      LEFT JOIN businesses b ON b.user_id = u.id
      ORDER BY u.created_at DESC
    `;

    // Counts breakdown
    const totalUsers = users.length;
    const businessesCount = users.filter((u) => u.role === 'business').length;
    const customersCount = users.filter((u) => u.role === 'customer').length;
    const agentsCount = users.filter((u) => u.role === 'sales_agent').length;
    const verifiedUsersCount = users.filter((u) => u.email_verified).length;

    // Generate CSV Content
    const csvHeaders = [
      'User ID',
      'Full Name',
      'Email Address',
      'Role',
      'Headline',
      'Email Verified',
      'Verified At',
      'Suspended',
      'Registered At',
      'Company Name',
      'Industry',
      'Business Status',
      'Package Type',
      'Trust Score',
    ];

    const csvRows = users.map((u) => [
      `"${u.id || ''}"`,
      `"${(u.full_name || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${u.role || ''}"`,
      `"${(u.headline || '').replace(/"/g, '""')}"`,
      u.email_verified ? 'YES' : 'NO',
      `"${u.email_verified_at ? new Date(u.email_verified_at).toISOString() : ''}"`,
      u.is_suspended ? 'YES' : 'NO',
      `"${u.created_at ? new Date(u.created_at).toISOString() : ''}"`,
      `"${(u.company_name || '').replace(/"/g, '""')}"`,
      `"${(u.industry || '').replace(/"/g, '""')}"`,
      `"${u.business_status || ''}"`,
      `"${u.package_type || ''}"`,
      u.trust_score ?? '',
    ]);

    const csvString = [csvHeaders.join(','), ...csvRows.map((r) => r.join(','))].join('\r\n');

    // Generate HTML Email
    const dateStr = new Date().toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
          .container { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .header { background: #0f172a; color: #ffffff; padding: 28px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; color: #f59e0b; }
          .header p { margin: 6px 0 0; font-size: 13px; color: #94a3b8; }
          .stats { display: flex; flex-wrap: wrap; gap: 12px; padding: 20px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; }
          .stat-box { flex: 1; min-width: 120px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center; }
          .stat-num { font-size: 22px; font-weight: bold; color: #0f172a; }
          .stat-lbl { font-size: 11px; text-transform: uppercase; color: #64748b; margin-top: 2px; }
          .table-container { padding: 20px; overflow-x: auto; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #0f172a; color: #ffffff; text-align: left; padding: 10px; border: 1px solid #334155; }
          td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: bold; }
          .badge-verified { background: #dcfce7; color: #15803d; }
          .badge-unverified { background: #fee2e2; color: #b91c1c; }
          .badge-biz { background: #dbeafe; color: #1d4ed8; }
          .badge-cust { background: #f3e8ff; color: #7e22ce; }
          .footer { background: #0f172a; color: #94a3b8; padding: 16px; text-align: center; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>VerifiedBizLink User Master Directory</h1>
            <p>Export compiled on ${dateStr} by Admin (${session.fullName || session.email})</p>
          </div>

          <div class="stats">
            <div class="stat-box">
              <div class="stat-num">${totalUsers}</div>
              <div class="stat-lbl">Total Users</div>
            </div>
            <div class="stat-box">
              <div class="stat-num">${businessesCount}</div>
              <div class="stat-lbl">Businesses</div>
            </div>
            <div class="stat-box">
              <div class="stat-num">${customersCount}</div>
              <div class="stat-lbl">Customers</div>
            </div>
            <div class="stat-box">
              <div class="stat-num">${agentsCount}</div>
              <div class="stat-lbl">Sales Agents</div>
            </div>
            <div class="stat-box">
              <div class="stat-num">${verifiedUsersCount}</div>
              <div class="stat-lbl">Email Verified</div>
            </div>
          </div>

          <div class="table-container">
            <p style="font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 0;">
              Latest Registered Accounts (Full CSV spreadsheet attached):
            </p>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Business / Headline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${users.map((u) => `
                  <tr>
                    <td><strong>${u.full_name || '—'}</strong></td>
                    <td>${u.email}</td>
                    <td><span class="badge ${u.role === 'business' ? 'badge-biz' : 'badge-cust'}">${u.role}</span></td>
                    <td>${u.company_name || u.headline || '—'}</td>
                    <td>
                      ${u.email_verified ? '<span class="badge badge-verified">Verified</span>' : '<span class="badge badge-unverified">Unverified</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>VerifiedBizLink Official Admin Service • info@verifiedbizlink.co.za</p>
            <p>This automated message includes an attached full CSV export file for spreadsheet analysis.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `VerifiedBizLink_Users_${timestamp}.csv`;

    await sendWithFallback({
      from: `"VerifiedBizLink Admin" <info@verifiedbizlink.co.za>`,
      to: recipientEmail,
      subject: `📊 VerifiedBizLink Users Master Export (${totalUsers} Users) — ${new Date().toLocaleDateString('en-ZA')}`,
      html: htmlBody,
      attachments: [
        {
          filename: fileName,
          content: csvString,
          contentType: 'text/csv',
        },
      ],
    });

    return NextResponse.json({
      ok: true,
      count: totalUsers,
      recipient: recipientEmail,
      fileName,
      message: `Successfully compiled and emailed master users list (${totalUsers} users) to ${recipientEmail}`,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Export users email error:', errorMsg);
    return NextResponse.json({ error: 'Failed to export and send user email', detail: errorMsg }, { status: 500 });
  }
}
