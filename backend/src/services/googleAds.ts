import axios from 'axios'
import { env } from '../core/config.js'

interface GoogleAdsTokens {
  clientId: string
  clientSecret: string
  refreshToken: string
  developerToken: string
  loginCustomerId?: string
}

function getCredentials(): GoogleAdsTokens {
  const { GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_LOGIN_CUSTOMER_ID } = env
  if (!GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_CLIENT_SECRET || !GOOGLE_ADS_REFRESH_TOKEN || !GOOGLE_ADS_DEVELOPER_TOKEN) {
    throw new Error('Credenciais Google Ads não configuradas no .env')
  }
  return {
    clientId: GOOGLE_ADS_CLIENT_ID,
    clientSecret: GOOGLE_ADS_CLIENT_SECRET,
    refreshToken: GOOGLE_ADS_REFRESH_TOKEN,
    developerToken: GOOGLE_ADS_DEVELOPER_TOKEN,
    loginCustomerId: GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  }
}

async function obterAccessToken(creds: GoogleAdsTokens): Promise<string> {
  const { data } = await axios.post('https://oauth2.googleapis.com/token', null, {
    params: {
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: 'refresh_token',
    },
  })
  return data.access_token
}

function buildHeaders(accessToken: string, creds: GoogleAdsTokens) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': creds.developerToken,
    'Content-Type': 'application/json',
  }
  if (creds.loginCustomerId) {
    headers['login-customer-id'] = creds.loginCustomerId
  }
  return headers
}

export interface GoogleAdsCampanhaMetrics {
  campaignId: string
  campaignName: string
  gasto: number
  impressoes: number
  cliques: number
  ctr: number
  conversoes: number
  roas: number | null
}

export async function buscarSaldoGoogleAds(customerId: string): Promise<{ balance: number; currency: string }> {
  const creds = getCredentials()
  const accessToken = await obterAccessToken(creds)
  const headers = buildHeaders(accessToken, creds)

  const query = `
    SELECT customer.id, customer.currency_code,
           customer_client.manager
    FROM customer_client
    WHERE customer_client.level = 0
  `

  // Google Ads nao tem "saldo" diretamente — usa budget diario total das campanhas ativas
  const budgetQuery = `
    SELECT campaign_budget.amount_micros, campaign_budget.status
    FROM campaign_budget
    WHERE campaign_budget.status = 'ENABLED'
  `

  const cleanId = customerId.replace(/-/g, '')
  const { data } = await axios.post(
    `https://googleads.googleapis.com/v18/customers/${cleanId}/googleAds:search`,
    { query: budgetQuery },
    { headers }
  )

  const rows = data.results ?? []
  const totalMicros = rows.reduce((sum: number, r: any) => sum + (r.campaignBudget?.amountMicros ?? 0), 0)

  return { balance: totalMicros / 1_000_000, currency: 'BRL' }
}

export async function buscarMetricasGoogleAds(customerId: string): Promise<GoogleAdsCampanhaMetrics[]> {
  const creds = getCredentials()
  const accessToken = await obterAccessToken(creds)
  const headers = buildHeaders(accessToken, creds)

  const query = `
    SELECT campaign.id, campaign.name,
           metrics.cost_micros, metrics.impressions, metrics.clicks,
           metrics.ctr, metrics.conversions, metrics.all_conversions_value
    FROM campaign
    WHERE segments.date DURING YESTERDAY
      AND campaign.status != 'REMOVED'
  `

  const cleanId = customerId.replace(/-/g, '')
  const { data } = await axios.post(
    `https://googleads.googleapis.com/v18/customers/${cleanId}/googleAds:search`,
    { query },
    { headers }
  )

  const rows = data.results ?? []
  return rows.map((r: any) => {
    const gasto = (r.metrics?.costMicros ?? 0) / 1_000_000
    const conversoes = r.metrics?.conversions ?? 0
    const allConversionsValue = r.metrics?.allConversionsValue ?? 0
    return {
      campaignId: r.campaign.id,
      campaignName: r.campaign.name,
      gasto,
      impressoes: r.metrics?.impressions ?? 0,
      cliques: r.metrics?.clicks ?? 0,
      ctr: (r.metrics?.ctr ?? 0) * 100,
      conversoes,
      roas: gasto > 0 && allConversionsValue > 0 ? allConversionsValue / gasto : null,
    }
  })
}
