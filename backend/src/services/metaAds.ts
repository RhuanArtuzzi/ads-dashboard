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
  actions?: Array<{ action_type: string; value: string }>
  date_start: string
  date_stop: string
}

export function carregarConfigMeta(): MetaConfig {
  const configPath = path.resolve(__dirname, '../../config/meta.yaml')
  const raw = fs.readFileSync(configPath, 'utf8')
  return yaml.load(raw) as MetaConfig
}

export async function buscarInsights(
  accountId: string,
  accessToken: string,
  apiVersion: string,
  datePreset = 'today'
): Promise<InsightCampanha[]> {
  const url = `https://graph.facebook.com/${apiVersion}/act_${accountId}/insights`
  const { data } = await axios.get(url, {
    params: {
      fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,actions',
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
  const url = `https://graph.facebook.com/${apiVersion}/act_${accountId}/campaigns`
  const { data } = await axios.get(url, {
    params: {
      fields: 'id,name,status,daily_budget',
      access_token: accessToken,
      limit: 100,
    },
  })
  return data.data ?? []
}

export function extrairConversoes(actions: InsightCampanha['actions']): number {
  if (!actions) return 0
  const convTypes = ['lead', 'offsite_conversion.fb_pixel_lead', 'omni_lead']
  const conv = actions.find((a) => convTypes.includes(a.action_type))
  return conv ? parseInt(conv.value) : 0
}
