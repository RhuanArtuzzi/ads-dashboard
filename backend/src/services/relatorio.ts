import { prisma } from '../core/database.js'
import { ChatAnthropic } from '@langchain/anthropic'
import PDFDocument from 'pdfkit'

const NAVY = '#1A1A3A'
const CYAN = '#009999'
const GRAY = '#666666'
const LIGHT = '#F5F5F8'

interface Kpis {
  gastoTotal: number
  conversoesTotal: number
  impressoesTotal: number
  alcanceTotal: number
  valorConversaoTotal: number
  cplMedio: number | null
  cpcMedio: number | null
  ctrMedio: number | null
  roasMedio: number | null
}

interface CampanhaRow {
  nome: string
  plataforma: string
  gasto: number
  conversoes: number
  cpl: number | null
  roas: number | null
}

interface RelatorioDados {
  cliente: { nome: string; targetCpl: number | null; targetRoas: number | null }
  dataInicio: Date
  dataFim: Date
  kpis: Kpis
  campanhas: CampanhaRow[]
  analiseIA: string
}

function brl(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function coletarDados(clienteId: string, dataInicio: Date, dataFim: Date) {
  const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id: clienteId } })

  const snapshots = await prisma.snapshotConta.findMany({
    where: { data: { gte: dataInicio, lte: dataFim }, conta: { clienteId } },
  })

  const campanhas = await prisma.campanha.findMany({
    where: { conta: { clienteId } },
    include: {
      snapshots: { where: { data: { gte: dataInicio, lte: dataFim } } },
      conta: { select: { plataforma: true } },
    },
  })

  const gastoTotal = snapshots.reduce((s, n) => s + n.gasto, 0)
  const conversoesTotal = snapshots.reduce((s, n) => s + n.conversoes, 0)
  const impressoesTotal = snapshots.reduce((s, n) => s + n.impressoes, 0)
  const cliquesTotal = snapshots.reduce((s, n) => s + n.cliques, 0)
  const alcanceTotal = snapshots.reduce((s, n) => s + (n.alcance ?? 0), 0)
  const valorConversaoTotal = snapshots.reduce((s, n) => s + (n.valorConversao ?? 0), 0)

  const kpis: Kpis = {
    gastoTotal,
    conversoesTotal,
    impressoesTotal,
    alcanceTotal,
    valorConversaoTotal,
    cplMedio: conversoesTotal > 0 ? gastoTotal / conversoesTotal : null,
    cpcMedio: cliquesTotal > 0 ? gastoTotal / cliquesTotal : null,
    ctrMedio: impressoesTotal > 0 ? (cliquesTotal / impressoesTotal) * 100 : null,
    roasMedio: valorConversaoTotal > 0 && gastoTotal > 0 ? valorConversaoTotal / gastoTotal : null,
  }

  const campanhaRows: CampanhaRow[] = campanhas
    .filter((c) => c.snapshots.length > 0)
    .map((c) => {
      const gasto = c.snapshots.reduce((s, n) => s + n.gasto, 0)
      const conversoes = c.snapshots.reduce((s, n) => s + n.conversoes, 0)
      const valorConversao = c.snapshots.reduce((s, n) => s + (n.valorConversao ?? 0), 0)
      return {
        nome: c.nome,
        plataforma: c.conta.plataforma,
        gasto,
        conversoes,
        cpl: conversoes > 0 ? gasto / conversoes : null,
        roas: valorConversao > 0 && gasto > 0 ? valorConversao / gasto : null,
      }
    })
    .sort((a, b) => b.gasto - a.gasto)
    .slice(0, 20)

  return { cliente, kpis, campanhas: campanhaRows }
}

async function gerarAnaliseIA(
  cliente: { nome: string; targetCpl: number | null; targetRoas: number | null },
  dataInicio: Date,
  dataFim: Date,
  kpis: Kpis,
  campanhas: CampanhaRow[]
): Promise<string> {
  const llm = new ChatAnthropic({ model: 'claude-haiku-4-5-20251001', temperature: 0.4 })

  const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR')
  const top5 = campanhas
    .slice(0, 5)
    .map((c) => `- ${c.nome} [${c.plataforma === 'META_ADS' ? 'Meta' : 'Google'}]: ${brl(c.gasto)} gasto | ${c.conversoes} conv. | CPL ${c.cpl ? brl(c.cpl) : 'N/D'} | ROAS ${c.roas ? c.roas.toFixed(2) + 'x' : 'N/D'}`)
    .join('\n')

  const prompt = `Você é um especialista em tráfego pago. Escreva um relatório executivo em português para o cliente "${cliente.nome}".

Período: ${fmtDate(dataInicio)} a ${fmtDate(dataFim)}

MÉTRICAS:
- Gasto Total: ${brl(kpis.gastoTotal)}
- Conversões: ${kpis.conversoesTotal}
- Valor de Conversão: ${brl(kpis.valorConversaoTotal)}
- ROAS: ${kpis.roasMedio ? kpis.roasMedio.toFixed(2) + 'x' : 'N/D'}
- CPL Médio: ${kpis.cplMedio ? brl(kpis.cplMedio) : 'N/D'}
- CPC Médio: ${kpis.cpcMedio ? brl(kpis.cpcMedio) : 'N/D'}
- CTR Médio: ${kpis.ctrMedio ? kpis.ctrMedio.toFixed(2) + '%' : 'N/D'}
- Alcance: ${kpis.alcanceTotal.toLocaleString('pt-BR')} pessoas
${cliente.targetCpl ? `- Meta CPL do cliente: ${brl(cliente.targetCpl)}` : ''}
${cliente.targetRoas ? `- Meta ROAS do cliente: ${cliente.targetRoas}x` : ''}

TOP CAMPANHAS:
${top5}

Escreva com estas seções exatas (sem markdown, sem asteriscos, apenas texto limpo):

RESUMO EXECUTIVO
[3-4 frases sobre o desempenho geral do período]

DESTAQUES POSITIVOS
- [ponto 1]
- [ponto 2]
- [ponto 3]

PONTOS DE ATENÇÃO
- [ponto 1]
- [ponto 2]

RECOMENDAÇÕES
- [ação 1]
- [ação 2]
- [ação 3]`

  const res = await llm.invoke(prompt)
  return typeof res.content === 'string' ? res.content : ''
}

function gerarPDF(dados: RelatorioDados): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const M = 50
    const CW = doc.page.width - M * 2

    // Header
    doc.rect(0, 0, doc.page.width, 72).fill(NAVY)
    doc.fill('#FFFFFF').font('Helvetica-Bold').fontSize(18).text('OMINY ADS DASHBOARD', M, 18)
    doc.fill(CYAN).font('Helvetica').fontSize(9.5).text('Relatório de Performance de Mídia Paga', M, 44)

    // Client info
    let y = 88
    doc.fill(NAVY).font('Helvetica-Bold').fontSize(14).text(dados.cliente.nome, M, y)
    y += 18
    const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR')
    doc.fill(GRAY).font('Helvetica').fontSize(9)
      .text(`Período: ${fmtDate(dados.dataInicio)} a ${fmtDate(dados.dataFim)}   |   Gerado em: ${fmtDate(new Date())}`, M, y)
    y += 22

    // Divider
    doc.moveTo(M, y).lineTo(M + CW, y).lineWidth(1.5).stroke(CYAN)
    y += 14

    // KPIs title
    doc.fill(NAVY).font('Helvetica-Bold').fontSize(10.5).text('MÉTRICAS DO PERÍODO', M, y)
    y += 15

    // KPI grid: 4 columns x 2 rows
    const kpis = [
      { label: 'GASTO TOTAL', value: brl(dados.kpis.gastoTotal) },
      { label: 'IMPRESSÕES', value: dados.kpis.impressoesTotal.toLocaleString('pt-BR') },
      { label: 'CONVERSÕES', value: dados.kpis.conversoesTotal.toLocaleString('pt-BR') },
      { label: 'VALOR CONVERSÃO', value: brl(dados.kpis.valorConversaoTotal) },
      { label: 'CPL MÉDIO', value: dados.kpis.cplMedio ? brl(dados.kpis.cplMedio) : '—' },
      { label: 'CPC MÉDIO', value: dados.kpis.cpcMedio ? brl(dados.kpis.cpcMedio) : '—' },
      { label: 'CTR MÉDIO', value: dados.kpis.ctrMedio ? dados.kpis.ctrMedio.toFixed(2) + '%' : '—' },
      { label: 'ALCANCE TOTAL', value: dados.kpis.alcanceTotal.toLocaleString('pt-BR') },
      { label: 'ROAS MÉDIO', value: dados.kpis.roasMedio ? dados.kpis.roasMedio.toFixed(2) + 'x' : '—' },
    ]

    const kpiCols = 3
    const kpiW = CW / kpiCols
    const kpiH = 46

    kpis.forEach(({ label, value }, i) => {
      const col = i % kpiCols
      const row = Math.floor(i / kpiCols)
      const x = M + col * kpiW
      const ky = y + row * (kpiH + 5)
      doc.rect(x + 2, ky, kpiW - 4, kpiH).fill(LIGHT)
      doc.fill(GRAY).font('Helvetica').fontSize(7).text(label, x + 8, ky + 8, { width: kpiW - 16 })
      doc.fill(NAVY).font('Helvetica-Bold').fontSize(12).text(value, x + 8, ky + 22, { width: kpiW - 16 })
    })

    y += 2 * (kpiH + 5) + 16

    // AI analysis
    doc.moveTo(M, y).lineTo(M + CW, y).lineWidth(1.5).stroke(CYAN)
    y += 14
    doc.fill(NAVY).font('Helvetica-Bold').fontSize(10.5).text('ANÁLISE DA IA', M, y)
    y += 14
    doc.fill('#222222').font('Helvetica').fontSize(9).text(dados.analiseIA, M, y, { width: CW, lineGap: 2 })
    y = doc.y + 18

    // New page if needed before table
    if (y > 650) {
      doc.addPage({ margin: 0 })
      y = 50
    }

    // Campaigns table
    doc.moveTo(M, y).lineTo(M + CW, y).lineWidth(1.5).stroke(CYAN)
    y += 14
    doc.fill(NAVY).font('Helvetica-Bold').fontSize(10.5).text('PERFORMANCE POR CAMPANHA', M, y)
    y += 15

    const cols = ['Campanha', 'Plataforma', 'Gasto', 'Conv.', 'CPL', 'ROAS']
    const colW = [175, 65, 70, 45, 70, 60]
    const rowH = 20

    // Header row
    doc.rect(M, y, CW, rowH).fill(NAVY)
    let tx = M
    cols.forEach((h, i) => {
      doc.fill('#FFFFFF').font('Helvetica-Bold').fontSize(7.5).text(h, tx + 5, y + 6, { width: colW[i] - 10 })
      tx += colW[i]
    })
    y += rowH

    // Data rows
    dados.campanhas.forEach((c, ri) => {
      if (y > 775) {
        doc.addPage({ margin: 0 })
        y = 50
      }
      doc.rect(M, y, CW, rowH).fill(ri % 2 === 0 ? '#FFFFFF' : LIGHT)
      tx = M
      const cells = [
        c.nome.length > 30 ? c.nome.slice(0, 30) + '…' : c.nome,
        c.plataforma === 'META_ADS' ? 'Meta Ads' : 'Google Ads',
        brl(c.gasto),
        c.conversoes.toLocaleString('pt-BR'),
        c.cpl ? brl(c.cpl) : '—',
        c.roas ? c.roas.toFixed(2) + 'x' : '—',
      ]
      cells.forEach((cell, i) => {
        doc.fill('#333333').font('Helvetica').fontSize(8).text(cell, tx + 5, y + 6, { width: colW[i] - 10 })
        tx += colW[i]
      })
      y += rowH
    })

    // Footer
    doc.fill(GRAY).font('Helvetica').fontSize(7.5)
      .text('Gerado por Ominy Ads Dashboard  •  ominy.tec.br', M, doc.page.height - 32, { align: 'center', width: CW })

    doc.end()
  })
}

export async function gerarRelatorio(
  clienteId: string,
  dataInicio: Date,
  dataFim: Date
): Promise<{ buffer: Buffer; nomeCliente: string }> {
  const { cliente, kpis, campanhas } = await coletarDados(clienteId, dataInicio, dataFim)
  const analiseIA = await gerarAnaliseIA(cliente, dataInicio, dataFim, kpis, campanhas)
  const buffer = await gerarPDF({ cliente, dataInicio, dataFim, kpis, campanhas, analiseIA })
  return { buffer, nomeCliente: cliente.nome }
}
