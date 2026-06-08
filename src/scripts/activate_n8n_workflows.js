// Activate/Deactivate n8n workflows via API
const N8N_API_URL = process.env.N8N_API_URL || 'https://dodgeqtr.app.n8n.cloud/api/v1'
const N8N_API_KEY = process.env.N8N_API_KEY

async function activateWorkflow(id, name) {
  try {
    const res = await fetch(`${N8N_API_URL}/workflows/${id}/activate`, {
      method: 'POST',
      headers: { 'X-N8N-API-KEY': N8N_API_KEY },
    })
    if (res.ok) console.log(`  [+] Activated: ${name} (${id})`)
    else console.log(`  [-] Failed: ${name} (${id}): ${res.status}`)
  } catch (err) {
    console.log(`  [!] Error: ${name}: ${err.message}`)
  }
}

async function main() {
  if (!N8N_API_KEY) {
    console.error('[-] N8N_API_KEY not set in environment')
    process.exit(1)
  }

  console.log('=== n8n Workflow Manager ===\n')

  // Fetch all workflows
  const res = await fetch(`${N8N_API_URL}/workflows?limit=100`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY },
  })

  if (!res.ok) {
    console.error(`[-] Failed to fetch workflows: ${res.status}`)
    process.exit(1)
  }

  const { data: workflows } = await res.json()
  console.log(`Total workflows: ${workflows.length}`)
  console.log(`Active: ${workflows.filter(w => w.active).length}`)
  console.log(`Inactive: ${workflows.filter(w => !w.active).length}\n`)

  // Find important inactive workflows to activate
  const priorityWorkflows = [
    { name: 'Google Drive Monitor', keywords: ['drive', 'google'] },
    { name: 'Daily Report', keywords: ['daily', 'report', 'صباح'] },
    { name: 'System Health', keywords: ['health', 'monitor', 'system'] },
  ]

  for (const pw of priorityWorkflows) {
    const match = workflows.find(w =>
      !w.active && pw.keywords.some(k => w.name.toLowerCase().includes(k))
    )
    if (match) {
      console.log(`Found inactive priority: ${match.name}`)
      await activateWorkflow(match.id, match.name)
    }
  }

  // Show inactive workflows
  const inactive = workflows.filter(w => !w.active)
  if (inactive.length > 0) {
    console.log(`\nRemaining inactive workflows:`)
    inactive.forEach(w => console.log(`  - ${w.name} (${w.id})`))
  }

  console.log('\n=== Done ===')
}

main().catch(console.error)
