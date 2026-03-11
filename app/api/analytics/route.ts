import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Total leads this month
    const totalLeadsResult = await query(`
      SELECT COUNT(*) as count FROM leads
      WHERE created_at >= date_trunc('month', NOW())
    `);

    // Qualified leads (score >= 60)
    const qualifiedLeadsResult = await query(`
      SELECT COUNT(*) as count FROM leads
      WHERE score >= 60 AND created_at >= date_trunc('month', NOW())
    `);

    // Total VAPI calls
    const totalCallsResult = await query(`
      SELECT COUNT(*) as count FROM vapi_calls
    `).catch(() => ({ rows: [{ count: 0 }] }));

    // Average lead score
    const avgScoreResult = await query(`
      SELECT ROUND(AVG(score)) as avg FROM leads WHERE score IS NOT NULL
    `);

    // Conversion rate (intent verified / total calls)
    const conversionResult = await query(`
      SELECT
        COUNT(*) FILTER (WHERE intent_verified = true) as verified,
        COUNT(*) as total
      FROM vapi_calls
    `).catch(() => ({ rows: [{ verified: 0, total: 0 }] }));

    // Leads over time (last 30 days)
    const leadsOverTimeResult = await query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Leads by inquiry type
    const leadsByTypeResult = await query(`
      SELECT
        COALESCE(inquiry_type, 'Unknown') as type,
        COUNT(*) as count
      FROM leads
      GROUP BY inquiry_type
      ORDER BY count DESC
    `);

    // Call status distribution
    const callStatusResult = await query(`
      SELECT
        COALESCE(call_status, 'unknown') as status,
        COUNT(*) as count
      FROM vapi_calls
      GROUP BY call_status
    `).catch(() => ({ rows: [] }));

    // Score distribution
    const scoreDistResult = await query(`
      SELECT
        CASE
          WHEN score BETWEEN 0 AND 20 THEN '0-20'
          WHEN score BETWEEN 21 AND 40 THEN '21-40'
          WHEN score BETWEEN 41 AND 60 THEN '41-60'
          WHEN score BETWEEN 61 AND 80 THEN '61-80'
          WHEN score BETWEEN 81 AND 100 THEN '81-100'
        END as range,
        COUNT(*) as count
      FROM leads
      WHERE score IS NOT NULL
      GROUP BY range
      ORDER BY range
    `);

    // Recent leads
    const recentLeadsResult = await query(`
      SELECT l.*, vc.call_status, vc.call_duration, vc.intent_verified, vc.cost_usd, vc.id as vapi_call_db_id
      FROM leads l
      LEFT JOIN vapi_calls vc ON vc.lead_id = l.id
      ORDER BY l.created_at DESC
      LIMIT 10
    `);

    // Recent calls
    const recentCallsResult = await query(`
      SELECT vc.*, l.name as lead_name
      FROM vapi_calls vc
      LEFT JOIN leads l ON l.id = vc.lead_id
      ORDER BY vc.created_at DESC
      LIMIT 10
    `).catch(() => ({ rows: [] }));

    const total = parseInt(conversionResult.rows[0].total) || 0;
    const verified = parseInt(conversionResult.rows[0].verified) || 0;

    return NextResponse.json({
      totalLeads: parseInt(totalLeadsResult.rows[0].count),
      qualifiedLeads: parseInt(qualifiedLeadsResult.rows[0].count),
      totalCalls: parseInt(totalCallsResult.rows[0].count),
      avgScore: parseInt(avgScoreResult.rows[0].avg) || 0,
      conversionRate: total > 0 ? Math.round((verified / total) * 100) : 0,
      leadsOverTime: leadsOverTimeResult.rows.map(r => ({
        date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: parseInt(r.count),
      })),
      leadsByType: leadsByTypeResult.rows.map(r => ({
        type: r.type,
        count: parseInt(r.count),
      })),
      callStatusDist: callStatusResult.rows.map(r => ({
        status: r.status,
        count: parseInt(r.count),
      })),
      scoreDistribution: scoreDistResult.rows.map(r => ({
        range: r.range,
        count: parseInt(r.count),
      })),
      recentLeads: recentLeadsResult.rows,
      recentCalls: recentCallsResult.rows,
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
