import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed...')

  // Usuário admin
  const senhaHash = await bcrypt.hash('admin123', 12)
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@ominy.com.br' },
    update: {},
    create: { nome: 'Admin Ominy', email: 'admin@ominy.com.br', senhaHash, role: 'ADMIN' },
  })
  console.log('Usuário admin criado:', admin.email)

  // Cliente 1
  const clienteA = await prisma.cliente.upsert({
    where: { id: 'seed-cliente-a' },
    update: {},
    create: { id: 'seed-cliente-a', nome: 'Loja Alpha', targetCpl: 45.0, targetRoas: 3.5 },
  })

  // Cliente 2
  const clienteB = await prisma.cliente.upsert({
    where: { id: 'seed-cliente-b' },
    update: {},
    create: { id: 'seed-cliente-b', nome: 'Studio Beta', targetCpl: 60.0, targetRoas: 2.8 },
  })

  // Conta Ads Cliente A
  const contaA = await prisma.contaAds.upsert({
    where: { id: 'seed-conta-a' },
    update: {},
    create: {
      id: 'seed-conta-a',
      clienteId: clienteA.id,
      plataforma: 'META_ADS',
      accountId: 'act_111111111',
      accountName: 'Loja Alpha — Meta',
    },
  })

  // Conta Ads Cliente B
  const contaB = await prisma.contaAds.upsert({
    where: { id: 'seed-conta-b' },
    update: {},
    create: {
      id: 'seed-conta-b',
      clienteId: clienteB.id,
      plataforma: 'META_ADS',
      accountId: 'act_222222222',
      accountName: 'Studio Beta — Meta',
    },
  })

  // Campanhas Cliente A
  const campanhas = [
    { id: 'seed-camp-a1', contaId: contaA.id, campanhaIdPlataforma: 'camp_a1', nome: 'Leads Frios — Alpha', status: 'ATIVA' as const, orcamentoDiario: 80 },
    { id: 'seed-camp-a2', contaId: contaA.id, campanhaIdPlataforma: 'camp_a2', nome: 'Remarketing — Alpha', status: 'ATIVA' as const, orcamentoDiario: 50 },
    { id: 'seed-camp-b1', contaId: contaB.id, campanhaIdPlataforma: 'camp_b1', nome: 'Awareness — Beta', status: 'ATIVA' as const, orcamentoDiario: 120 },
    { id: 'seed-camp-b2', contaId: contaB.id, campanhaIdPlataforma: 'camp_b2', nome: 'Conversao — Beta', status: 'PAUSADA' as const, orcamentoDiario: 60 },
  ]

  for (const c of campanhas) {
    await prisma.campanha.upsert({ where: { id: c.id }, update: {}, create: c })
  }

  // Snapshots dos últimos 30 dias
  const hoje = new Date()
  const contas = [contaA, contaB]

  for (let i = 29; i >= 0; i--) {
    const data = new Date(hoje)
    data.setDate(data.getDate() - i)
    data.setHours(0, 0, 0, 0)

    for (const conta of contas) {
      const base = conta.id === contaA.id ? 1 : 1.4
      const gasto = parseFloat((base * (200 + Math.random() * 80)).toFixed(2))
      const impressoes = Math.floor(base * (8000 + Math.random() * 3000))
      const cliques = Math.floor(impressoes * (0.02 + Math.random() * 0.01))
      const conversoes = Math.floor(cliques * (0.08 + Math.random() * 0.04))
      const cpl = conversoes > 0 ? parseFloat((gasto / conversoes).toFixed(2)) : null
      const roas = parseFloat((2.5 + Math.random() * 2).toFixed(2))
      const ctr = parseFloat(((cliques / impressoes) * 100).toFixed(2))

      await prisma.snapshotConta.upsert({
        where: { contaId_data: { contaId: conta.id, data } },
        update: {},
        create: { contaId: conta.id, data, gasto, impressoes, cliques, conversoes, cpl, roas, ctr },
      })
    }
  }

  // Alerta de exemplo
  await prisma.alerta.create({
    data: {
      clienteId: clienteA.id,
      tipo: 'CPL_ALTO',
      mensagem: 'Campanha "Leads Frios — Alpha" com CPL R$78 (meta: R$45)',
    },
  }).catch(() => {})

  // Resumo IA de exemplo
  const dataHoje = new Date()
  dataHoje.setHours(0, 0, 0, 0)
  await prisma.resumoIA.upsert({
    where: { data: dataHoje },
    update: {},
    create: {
      data: dataHoje,
      conteudo: `Destaques positivos:
- Campanha "Remarketing — Alpha" com ROAS de 4.1x (meta: 3.5x)
- CPL da conta Studio Beta caiu 12% vs semana passada

Atencao necessaria:
- Campanha "Leads Frios — Alpha" com CPL R$78, acima da meta de R$45
- "Conversao — Beta" pausada ha 3 dias sem retomada

Sugestoes do gestor:
- Revisar criativos de "Leads Frios — Alpha" ou ajustar segmentacao
- Reativar "Conversao — Beta" com orcamento reduzido para teste
- Aumentar budget de "Remarketing — Alpha" em 20% aproveitando ROAS elevado`,
    },
  })

  console.log('Seed concluido!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
