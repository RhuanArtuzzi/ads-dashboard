import axios from 'axios'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface ContaConfig {
  nome: string
  account_id: string
  access_token: string
  cliente_id: string
}

interface MetaConfig {
  meta_api_version: string
  contas: ContaConfig[]
}

interface InsightCampanha {
  campaign_id: string
  campaign_name: string
  spend: string
  impressions: string
  clicks: string
  ctr: string
  reach?: string
  actions?: Array<{ action_type: string; value: string }>
  action_values?: Array<{ action_type: string; value: string }>
  date_start: string
  date_stop: string
}

interface MetaInsightsPage {
  data: InsightCampanha[]
  paging?: { next?: string; cursors?: { after?: string } }
}

export function carregarConfigMeta(): MetaConfig {
  const configPath = path.resolve(__dirname, '../../config/meta.yaml')
  const raw = fs.readFileSync(configPath, 'utf8')
  return yaml.load(raw) as MetaConfig
}

// accountId no banco ja inclui o prefixo act_ (ex: act_143086142456612)
export async function buscarInsightsPeriodo(
  accountId: string,
  accessToken: string,
  apiVersion: string,
  since: string,
  until: string
): Promise<InsightCampanha[]> {
  const url = `https://graph.facebook.com/${apiVersion}/${accountId}/insights`
  const results: InsightCampanha[] = []
  let after: string | null = null

  while (true) {
    const params: Record<string, unknown> = {
      fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,reach,actions,action_values',
      time_range: JSON.stringify({ since, until }),
      time_increment: 1,
      level: 'campaign',
      access_token: accessToken,
      limit: 500,
    }
    if (after) params.after = after

    const res = await axios.get<MetaInsightsPage>(url, { timeout: 60000, params })
    const page: MetaInsightsPage = res.data
    results.push(...(page.data ?? []))
    after = page.paging?.next ? (page.paging?.cursors?.after ?? null) : null
    if (!after) break
  }

  return results
}

export async function buscarInsights(
  accountId: string,
  accessToken: string,
  apiVersion: string,
  datePreset = 'today'
): Promise<InsightCampanha[]> {
  const url = `https://graph.facebook.com/${apiVersion}/${accountId}/insights`
  const { data } = await axios.get(url, {
    params: {
      fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,reach,actions,action_values',
      date_preset: datePreset,
      level: 'campaign',
      access_token: accessToken,
      limit: 100,
    },
  })
  return data.data ?? []
}

export async function buscarCampanhas(
  accountId: string,
  accessToken: string,
  apiVersion: string
): Promise<Array<{ id: string; name: string; status: string; daily_budget?: string }>> {
  const url = `https://graph.facebook.com/${apiVersion}/${accountId}/campaigns`
  const { data } = await axios.get(url, {
    params: {
      fields: 'id,name,status,daily_budget',
      access_token: accessToken,
      limit: 100,
    },
  })
  return data.data ?? []
}

export async function buscarSaldoConta(
  accountId: string,
  accessToken: string,
  apiVersion: string
): Promise<{ name: string; balance: number; currency: string }> {
  const url = `https://graph.facebook.com/${apiVersion}/${accountId}`
  const { data } = await axios.get(url, {
    params: { fields: 'id,name,balance,currency', access_token: accessToken },
  })
  if (data.error) throw new Error(`Meta API: ${data.error.message}`)
  return { name: data.name, balance: parseFloat(data.balance ?? '0') / 100, currency: data.currency ?? 'BRL' }
}

export function extrairConversoes(actions: InsightCampanha['actions']): number {
  if (!actions) return 0
  const convTypes = ['lead', 'offsite_conversion.fb_pixel_lead', 'omni_lead', 'purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase']
  return actions
    .filter((a) => convTypes.includes(a.action_type))
    .reduce((s, a) => s + parseInt(a.value || '0'), 0)
}

export function extrairValorConversao(actionValues: InsightCampanha['action_values']): number {
  if (!actionValues) return 0
  const valueTypes = ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase', 'lead', 'omni_lead']
  return actionValues
    .filter((a) => valueTypes.includes(a.action_type))
    .reduce((s, a) => s + parseFloat(a.value || '0'), 0)
}
