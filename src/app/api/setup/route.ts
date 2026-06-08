import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { hash } from 'bcryptjs';

export async function POST(request: NextRequest) {
  // Require SETUP_SECRET to prevent unauthorized DB resets
  const incomingSecret = request.headers.get('x-setup-secret');
  const expectedSecret = process.env.SETUP_SECRET;
  if (!expectedSecret || !incomingSecret || incomingSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Create all tables
    await db`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        headline VARCHAR(255) DEFAULT '',
        location VARCHAR(255) DEFAULT '',
        avatar_url VARCHAR(500) DEFAULT '',
        role VARCHAR(50) DEFAULT 'user',
        date_of_birth DATE,
        connections_count INTEGER DEFAULT 0,
        vetting_score INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS businesses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        industry VARCHAR(255) DEFAULT '',
        reg_number VARCHAR(255) DEFAULT '',
        vat_number VARCHAR(255) DEFAULT '',
        status VARCHAR(50) DEFAULT 'unregistered',
        trust_score INTEGER DEFAULT 0,
        description TEXT DEFAULT '',
        website VARCHAR(255) DEFAULT '',
        phone VARCHAR(50) DEFAULT '',
        address TEXT DEFAULT '',
        submitted_at TIMESTAMPTZ,
        verified_at TIMESTAMPTZ,
        reviewed_by UUID,
        review_notes TEXT DEFAULT '',
        connections_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        doc_type VARCHAR(50) DEFAULT 'other',
        file_url VARCHAR(500) DEFAULT '',
        status VARCHAR(50) DEFAULT 'uploaded',
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS post_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(post_id, user_id)
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS post_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(requester_id, receiver_id)
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS compliance_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reported_user_id UUID REFERENCES users(id),
        reporter_id UUID REFERENCES users(id),
        report_type VARCHAR(255) NOT NULL,
        risk_level VARCHAR(50) DEFAULT 'medium',
        description TEXT DEFAULT '',
        status VARCHAR(50) DEFAULT 'open',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID,
        admin_name VARCHAR(255) DEFAULT '',
        action VARCHAR(255) NOT NULL,
        target_type VARCHAR(50) DEFAULT '',
        target_id VARCHAR(255) DEFAULT '',
        target_name VARCHAR(255) DEFAULT '',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) DEFAULT 'info',
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        link VARCHAR(255) DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Always seed shareholder accounts (safe to re-run with ON CONFLICT DO NOTHING)
    const shareholderHash = await hash('Share@123', 12);
    await db`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url, vetting_score)
      VALUES 
        ('shareholder1@vbl.com', ${shareholderHash}, 'Shareholder One', 'admin', 'Co-Founder & Shareholder — VerifiedBizLink', 'https://picsum.photos/seed/sh1/200/200', 100),
        ('shareholder2@vbl.com', ${shareholderHash}, 'Shareholder Two', 'admin', 'Co-Founder & Shareholder — VerifiedBizLink', 'https://picsum.photos/seed/sh2/200/200', 100),
        ('shareholder3@vbl.com', ${shareholderHash}, 'Shareholder Three', 'admin', 'Co-Founder & Shareholder — VerifiedBizLink', 'https://picsum.photos/seed/sh3/200/200', 100)
      ON CONFLICT (email) DO NOTHING
    `;

    // Seed demo data (skip if already seeded)
    const existing = await db`SELECT COUNT(*) AS count FROM users`;
    if (parseInt(existing[0].count) > 3) {
      return NextResponse.json({
        message: 'Database already seeded — shareholder accounts refreshed',
        shareholders: {
          shareholder1: 'shareholder1@vbl.com / Share@123',
          shareholder2: 'shareholder2@vbl.com / Share@123',
          shareholder3: 'shareholder3@vbl.com / Share@123',
          inviteCode: 'VBL2026 (use this at /signup → Shareholder tab to register with your own email)',
        },
      });
    }

    // Create admin/staff accounts
    const adminHash = await hash('Admin@123', 12);
    const bankerHash = await hash('Banker@123', 12);
    const lawyerHash = await hash('Lawyer@123', 12);
    const userHash = await hash('Pass@123', 12);

    const admin = await db`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url, vetting_score)
      VALUES ('admin@vbl.com', ${adminHash}, 'Alex Morgan', 'admin', 'Chief Systems Architect', 'https://picsum.photos/seed/admin1/200/200', 100)
      RETURNING id
    `;

    const banker = await db`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url, vetting_score)
      VALUES ('banker@vbl.com', ${bankerHash}, 'James Okafor', 'banker', 'Senior Business Analyst & Verification Specialist', 'https://picsum.photos/seed/banker1/200/200', 100)
      RETURNING id
    `;

    const lawyer = await db`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url, vetting_score)
      VALUES ('lawyer@vbl.com', ${lawyerHash}, 'Diana Goldstein', 'lawyer', 'Corporate Compliance & Legal Officer', 'https://picsum.photos/seed/lawyer1/200/200', 100)
      RETURNING id
    `;

    // Create verified business users
    const sarah = await db`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url, connections_count, vetting_score)
      VALUES ('sarah@nexgen.com', ${userHash}, 'Sarah Jenkins', 'business', 'CEO at NexGen Solutions', 'https://picsum.photos/seed/user-me/200/200', 1200, 98)
      RETURNING id
    `;

    const elena = await db`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url, connections_count, vetting_score)
      VALUES ('elena@arcticlogistics.com', ${userHash}, 'Elena Petrova', 'business', 'COO at Arctic Logistics', 'https://picsum.photos/seed/user-4/200/200', 340, 95)
      RETURNING id
    `;

    const marcus = await db`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url, connections_count, vetting_score)
      VALUES ('marcus@thornecapital.com', ${userHash}, 'Marcus Thorne', 'business', 'Founder & CEO at Thorne Capital', 'https://picsum.photos/seed/user-5/200/200', 890, 97)
      RETURNING id
    `;

    const jin = await db`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url, connections_count, vetting_score)
      VALUES ('jin@quantumcyber.com', ${userHash}, 'Jin Woo', 'business', 'CTO at Quantum Cyber', 'https://picsum.photos/seed/user-6/200/200', 520, 92)
      RETURNING id
    `;

    const robert = await db`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url, connections_count, vetting_score)
      VALUES ('robert@foxlogistics.com', ${userHash}, 'Robert Fox', 'business', 'Supply Chain Manager at Fox Logistics', 'https://picsum.photos/seed/net1/200/200', 200, 88)
      RETURNING id
    `;

    const pending1 = await db`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url, vetting_score)
      VALUES ('owner@apexdynamics.com', ${userHash}, 'Victor Mensah', 'business', 'Founder at Apex Dynamics', 'https://picsum.photos/seed/sug1/200/200', 0)
      RETURNING id
    `;

    const pending2 = await db`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url, vetting_score)
      VALUES ('ceo@skylinerealty.com', ${userHash}, 'Amara Osei', 'business', 'CEO at Skyline Realty Group', 'https://picsum.photos/seed/sug3/200/200', 0)
      RETURNING id
    `;

    // Create business profiles
    const nexgen = await db`
      INSERT INTO businesses (user_id, company_name, industry, reg_number, vat_number, status, trust_score, description, website, phone, address, submitted_at, verified_at, connections_count)
      VALUES (${sarah[0].id}, 'NexGen Solutions', 'Technology & AI', 'CK2019/234567/23', '4123456789', 'verified', 98, 'Leading AI-powered business automation solutions for enterprise clients across Africa.', 'https://nexgen.com', '+27 21 555 0100', '15 Innovation Drive, Cape Town, 8001', NOW() - INTERVAL '30 days', NOW() - INTERVAL '20 days', 1200)
      RETURNING id
    `;

    const arctic = await db`
      INSERT INTO businesses (user_id, company_name, industry, reg_number, vat_number, status, trust_score, description, website, submitted_at, verified_at, connections_count)
      VALUES (${elena[0].id}, 'Arctic Logistics', 'Logistics & Supply Chain', 'CK2018/112233/23', '4987654321', 'verified', 95, 'Nordic and European supply chain specialists delivering B2B logistics excellence.', 'https://arcticlogistics.com', NOW() - INTERVAL '60 days', NOW() - INTERVAL '45 days', 340)
      RETURNING id
    `;

    const thorne = await db`
      INSERT INTO businesses (user_id, company_name, industry, reg_number, vat_number, status, trust_score, description, website, submitted_at, verified_at, connections_count)
      VALUES (${marcus[0].id}, 'Thorne Capital', 'Investment & Finance', 'CK2020/445566/23', '4567891234', 'verified', 97, 'Private equity and venture capital firm focused on transparent, high-integrity investment.', 'https://thornecapital.com', NOW() - INTERVAL '90 days', NOW() - INTERVAL '75 days', 890)
      RETURNING id
    `;

    const quantum = await db`
      INSERT INTO businesses (user_id, company_name, industry, reg_number, vat_number, status, trust_score, description, website, submitted_at, verified_at, connections_count)
      VALUES (${jin[0].id}, 'Quantum Cyber', 'Cybersecurity', 'CK2021/778899/23', '4321098765', 'verified', 92, 'Next-generation cybersecurity solutions and B2B security research for enterprise.', 'https://quantumcyber.com', NOW() - INTERVAL '45 days', NOW() - INTERVAL '30 days', 520)
      RETURNING id
    `;

    await db`
      INSERT INTO businesses (user_id, company_name, industry, reg_number, status, trust_score, description, submitted_at, verified_at, connections_count)
      VALUES (${robert[0].id}, 'Fox Logistics', 'Transport & Logistics', 'CK2022/334455/23', 'verified', 88, 'End-to-end logistics, warehousing and distribution services.', NOW() - INTERVAL '20 days', NOW() - INTERVAL '10 days', 200)
      RETURNING id
    `;

    const apex = await db`
      INSERT INTO businesses (user_id, company_name, industry, reg_number, status, trust_score, description, submitted_at)
      VALUES (${pending1[0].id}, 'Apex Dynamics', 'AI Automation', 'CK2023/556677/23', 'pending', 30, 'AI-powered process automation and robotics for manufacturing.', NOW() - INTERVAL '2 days')
      RETURNING id
    `;

    const skyline = await db`
      INSERT INTO businesses (user_id, company_name, industry, reg_number, status, trust_score, description, submitted_at)
      VALUES (${pending2[0].id}, 'Skyline Realty Group', 'Commercial Real Estate', 'CK2023/889900/23', 'reviewing', 60, 'Premium commercial property management and development company.', NOW() - INTERVAL '5 days')
      RETURNING id
    `;

    // Add documents for verified businesses
    await db`
      INSERT INTO documents (business_id, name, doc_type, status) VALUES
      (${nexgen[0].id}, 'CIPC Registration Certificate', 'cipc', 'verified'),
      (${nexgen[0].id}, 'VAT Compliance Letter', 'vat', 'verified'),
      (${nexgen[0].id}, 'Identity Proof of Directors', 'id', 'verified')
    `;

    await db`
      INSERT INTO documents (business_id, name, doc_type, status) VALUES
      (${arctic[0].id}, 'CIPC Registration Certificate', 'cipc', 'verified'),
      (${arctic[0].id}, 'VAT Compliance Letter', 'vat', 'verified')
    `;

    await db`
      INSERT INTO documents (business_id, name, doc_type, status) VALUES
      (${apex[0].id}, 'CIPC Registration Certificate', 'cipc', 'uploaded')
    `;

    // Seed posts
    await db`
      INSERT INTO posts (user_id, content, likes_count, comments_count, created_at) VALUES
      (
        ${elena[0].id},
        'We are thrilled to announce our expansion into the Nordic market! This move allows us to provide even more efficient supply chain solutions to our B2B partners across Europe. Looking forward to new collaborations. #Logistics #B2BNetworking',
        42, 12, NOW() - INTERVAL '2 hours'
      ),
      (
        ${marcus[0].id},
        'Integrity is the bedrock of business. Our recent audit confirmed our commitment to 100% transparent operations. Trust is something we build every single day. Proud to be verified on VerifiedBizLink. #Finance #Transparency',
        128, 24, NOW() - INTERVAL '5 hours'
      ),
      (
        ${jin[0].id},
        'New whitepaper alert! We have just published our findings on B2B security trends for 2026. Download your copy to see how the cybersecurity landscape is shifting. Link in bio. #Cybersecurity #B2B',
        89, 5, NOW() - INTERVAL '8 hours'
      ),
      (
        ${sarah[0].id},
        'Excited to announce that NexGen Solutions has achieved full verification on VerifiedBizLink! This platform is a game changer for trusted B2B networking. Our vetting score: 98%. #Verified #TechStartup',
        215, 34, NOW() - INTERVAL '1 day'
      ),
      (
        ${robert[0].id},
        'Q1 results are in and Fox Logistics has exceeded delivery SLAs by 14%. What sets us apart? A verified network of trusted partners. Thank you to our B2B clients! #Logistics #Excellence',
        67, 9, NOW() - INTERVAL '2 days'
      )
    `;

    // Seed connections
    await db`
      INSERT INTO connections (requester_id, receiver_id, status) VALUES
      (${sarah[0].id}, ${elena[0].id}, 'accepted'),
      (${sarah[0].id}, ${marcus[0].id}, 'accepted'),
      (${sarah[0].id}, ${jin[0].id}, 'accepted'),
      (${elena[0].id}, ${marcus[0].id}, 'accepted'),
      (${jin[0].id}, ${robert[0].id}, 'accepted'),
      (${pending1[0].id}, ${sarah[0].id}, 'pending')
    `;

    // Seed compliance reports
    await db`
      INSERT INTO compliance_reports (reported_user_id, reporter_id, report_type, risk_level, description, status) VALUES
      (${pending1[0].id}, ${sarah[0].id}, 'Unverified Business Claims', 'High', 'Company is claiming verified status without completing the vetting process.', 'investigating'),
      (${pending2[0].id}, ${marcus[0].id}, 'Terms & Conditions Violation', 'Medium', 'Business posted misleading financial projections in the feed.', 'open')
    `;

    // Seed audit logs
    await db`
      INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name) VALUES
      (${banker[0].id}, 'James Okafor', 'Verified Business', 'business', ${nexgen[0].id}, 'NexGen Solutions'),
      (${banker[0].id}, 'James Okafor', 'Verified Business', 'business', ${thorne[0].id}, 'Thorne Capital'),
      (${lawyer[0].id}, 'Diana Goldstein', 'Updated Terms', 'system', 'policy-v2', 'Privacy Policy v2.1'),
      (${admin[0].id}, 'Alex Morgan', 'System Health Check', 'system', 'infra-01', 'Database Cluster'),
      (${banker[0].id}, 'James Okafor', 'Set to Reviewing', 'business', ${skyline[0].id}, 'Skyline Realty Group'),
      (${lawyer[0].id}, 'Diana Goldstein', 'Accepted Report', 'business', ${pending1[0].id}, 'Apex Dynamics Fraud Report')
    `;

    // Update user connections counts
    await db`UPDATE users SET connections_count = 3 WHERE id = ${sarah[0].id}`;
    await db`UPDATE users SET connections_count = 2 WHERE id = ${elena[0].id}`;
    await db`UPDATE users SET connections_count = 2 WHERE id = ${marcus[0].id}`;

    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized and seeded successfully!',
      credentials: {
        admin: 'admin@vbl.com / Admin@123',
        banker: 'banker@vbl.com / Banker@123',
        lawyer: 'lawyer@vbl.com / Lawyer@123',
        business: 'sarah@nexgen.com / Pass@123',
        pendingBusiness: 'owner@apexdynamics.com / Pass@123',
        shareholders: {
          shareholder1: 'shareholder1@vbl.com / Share@123',
          shareholder2: 'shareholder2@vbl.com / Share@123',
          shareholder3: 'shareholder3@vbl.com / Share@123',
          inviteCode: 'VBL2026',
        }
      }
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: error.message || 'Setup failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const tables = await db`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    const [userCount] = await db`SELECT COUNT(*) AS count FROM users`.catch(() => [{ count: 0 }]);
    return NextResponse.json({ 
      tables: tables.map(t => t.table_name),
      userCount: userCount?.count || 0,
      status: 'connected'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, status: 'error' }, { status: 500 });
  }
}
