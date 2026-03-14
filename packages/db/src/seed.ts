import { faker } from '@faker-js/faker'
import { db, pool } from './client.js'
import {
  workspaces,
  users,
  workspaceMembers,
  experiments,
  tags,
  experimentTags,
} from './schema/index.js'

// ─── Realistic A/B test experiment names + hypotheses ───────────────────────

const EXPERIMENT_TEMPLATES: Array<{
  name: string
  hypothesis: string
  team: string
}> = [
  {
    name: 'Checkout CTA button colour — blue vs green',
    hypothesis:
      'Changing the primary CTA from blue to green will increase purchase conversions by 5% because green is associated with positive action in our user research.',
    team: 'Growth',
  },
  {
    name: 'Homepage hero image — lifestyle vs product',
    hypothesis:
      'Showing a lifestyle image instead of a product shot on the homepage will improve time-on-site and reduce bounce rate by appealing to aspirational motivations.',
    team: 'Marketing',
  },
  {
    name: 'Onboarding flow — 3-step vs 5-step',
    hypothesis:
      'Reducing the onboarding flow from 5 steps to 3 steps will increase completion rate by removing friction, even at the cost of some profile completeness.',
    team: 'Product',
  },
  {
    name: 'Pricing page layout — feature-first vs price-first',
    hypothesis:
      'Leading with features rather than price anchors will lift plan upgrades because users who understand value first are more price-tolerant.',
    team: 'Growth',
  },
  {
    name: 'Email subject line — question vs statement format',
    hypothesis:
      'Using a question format in weekly digest subject lines will increase open rates by creating curiosity gaps compared to declarative statements.',
    team: 'Marketing',
  },
  {
    name: 'Search results — card view vs list view default',
    hypothesis:
      'Defaulting to card view for search results will increase click-through rate because visual thumbnails help users evaluate relevance faster.',
    team: 'Product',
  },
  {
    name: 'Free trial CTA — "Start free trial" vs "Try for free"',
    hypothesis:
      'The phrasing "Try for free" reduces perceived commitment and will yield a higher trial sign-up rate than "Start free trial".',
    team: 'Growth',
  },
  {
    name: 'Dashboard empty state — illustration vs copy-only',
    hypothesis:
      'An illustrated empty state will increase the rate of first experiment creation because it reduces cognitive load and makes the path forward clearer.',
    team: 'Design',
  },
  {
    name: 'Mobile nav — bottom tab bar vs hamburger menu',
    hypothesis:
      'Switching to a bottom tab bar on mobile will increase core feature engagement by making navigation more thumb-friendly and discoverable.',
    team: 'Mobile',
  },
  {
    name: 'Social proof placement — above vs below fold',
    hypothesis:
      'Placing the logo strip of customer logos above the fold will reduce bounce rate by establishing immediate trust with new visitors.',
    team: 'Marketing',
  },
  {
    name: 'Notification preferences — opt-out vs opt-in default',
    hypothesis:
      'Defaulting users to opt-in for weekly digest emails will increase email engagement without significantly increasing unsubscribe rates.',
    team: 'Growth',
  },
  {
    name: 'Report export — CSV only vs CSV + PDF toggle',
    hypothesis:
      'Offering a PDF export option alongside CSV will increase report export usage among non-technical stakeholders who prefer formatted documents.',
    team: 'Product',
  },
  {
    name: 'Sign-up form — single page vs multi-step',
    hypothesis:
      'A single-page sign-up form will reduce drop-off compared to a multi-step flow by showing users the full scope of required information upfront.',
    team: 'Growth',
  },
  {
    name: 'Tooltip copy — technical vs plain-language',
    hypothesis:
      'Rewriting metric tooltips in plain language will decrease support tickets related to dashboard confusion and improve self-service resolution.',
    team: 'Product',
  },
  {
    name: 'In-app upsell modal — feature-gated vs proactive',
    hypothesis:
      'Showing a proactive upsell modal after 5 experiments rather than only at feature gates will increase Pro plan conversions without hurting retention.',
    team: 'Growth',
  },
  {
    name: 'Experiment card — compact vs expanded default',
    hypothesis:
      'Defaulting to expanded cards in the experiment list will reduce time-to-insight because users can scan key metrics without opening each record.',
    team: 'Design',
  },
  {
    name: 'Password reset flow — single email vs code + link',
    hypothesis:
      'Using a 6-digit code alongside the magic link for password reset will reduce friction on mobile where deep links are unreliable.',
    team: 'Engineering',
  },
  {
    name: 'Trial expiry banner — 7-day vs 3-day warning',
    hypothesis:
      'Showing the trial expiry warning at 7 days instead of 3 gives users more time to evaluate, leading to a higher conversion rate at trial end.',
    team: 'Growth',
  },
  {
    name: 'Collaboration invite — inline vs modal',
    hypothesis:
      'An inline invite form within the members settings page will increase team invitations sent per workspace by reducing modal fatigue.',
    team: 'Product',
  },
  {
    name: 'Dark mode default — system preference vs always light',
    hypothesis:
      'Respecting the OS dark-mode preference by default will improve perceived quality among developer users without negatively impacting non-technical users.',
    team: 'Design',
  },
]

const STATUSES = ['draft', 'active', 'completed', 'stopped'] as const
const RESULTS = ['WON', 'LOST', 'INCONCLUSIVE', 'STOPPED', null] as const
const TAG_DEFS = [
  { name: 'High Impact', color: '#ef4444' },
  { name: 'Quick Win', color: '#22c55e' },
  { name: 'Mobile', color: '#3b82f6' },
  { name: 'Revenue', color: '#f59e0b' },
  { name: 'Retention', color: '#8b5cf6' },
] as const

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱  Starting seed…')

  // 1. Workspace
  console.log('  → Creating workspace…')
  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: 'Acme Corp',
      slug: 'acme',
      plan: 'pro',
      max_experiments: 500,
      max_members: 20,
    })
    .returning()

  if (!workspace) throw new Error('Failed to create workspace')
  console.log(`     workspace id: ${workspace.id}`)

  // 2. Users
  console.log('  → Creating users…')
  const [adminUser] = await db
    .insert(users)
    .values({
      clerk_user_id: `clerk_admin_${faker.string.alphanumeric(12)}`,
      email: 'alice@acme.com',
      name: 'Alice Admin',
      avatar_url: faker.image.avatarGitHub(),
    })
    .returning()

  const [editorUser] = await db
    .insert(users)
    .values({
      clerk_user_id: `clerk_editor_${faker.string.alphanumeric(12)}`,
      email: 'bob@acme.com',
      name: 'Bob Editor',
      avatar_url: faker.image.avatarGitHub(),
    })
    .returning()

  if (!adminUser || !editorUser) throw new Error('Failed to create users')
  console.log(`     admin id: ${adminUser.id}`)
  console.log(`     editor id: ${editorUser.id}`)

  // 3. Workspace members
  console.log('  → Creating workspace members…')
  await db.insert(workspaceMembers).values([
    {
      workspace_id: workspace.id,
      user_id: adminUser.id,
      role: 'admin',
    },
    {
      workspace_id: workspace.id,
      user_id: editorUser.id,
      role: 'editor',
      invited_by: adminUser.id,
    },
  ])

  // 4. Tags
  console.log('  → Creating tags…')
  const createdTags = await db
    .insert(tags)
    .values(
      TAG_DEFS.map((t) => ({
        workspace_id: workspace.id,
        name: t.name,
        color: t.color,
      })),
    )
    .returning()

  console.log(`     created ${createdTags.length} tags`)

  // 5. Experiments
  console.log('  → Creating 20 experiments…')

  for (let i = 0; i < 20; i++) {
    const template = EXPERIMENT_TEMPLATES[i]
    if (!template) continue

    const status = STATUSES[i % STATUSES.length] ?? 'draft'
    const isFinished = status === 'completed' || status === 'stopped'
    const result = isFinished ? (RESULTS[i % 4] ?? null) : null
    const owner = i % 3 === 0 ? editorUser : adminUser
    const isShipped = result === 'WON' && faker.datatype.boolean()

    const now = new Date()
    const startedAt =
      isFinished || status === 'active'
        ? faker.date.between({
            from: new Date(now.getTime() - 90 * 86400000),
            to: new Date(now.getTime() - 7 * 86400000),
          })
        : null
    const endedAt =
      isFinished && startedAt ? faker.date.between({ from: startedAt, to: now }) : null

    const [exp] = await db
      .insert(experiments)
      .values({
        workspace_id: workspace.id,
        created_by: adminUser.id,
        owner_id: owner.id,
        name: template.name,
        hypothesis: template.hypothesis,
        status,
        result,
        team: template.team,
        source: 'manual',
        variants: [
          { name: 'Control', description: 'Original version', is_control: true },
          { name: 'Treatment', description: 'New variant', is_control: false },
        ],
        metrics: [
          {
            name: 'Conversion Rate',
            type: 'rate',
            baseline: faker.number.float({ min: 0.02, max: 0.15, fractionDigits: 4 }),
            target: faker.number.float({ min: 0.16, max: 0.25, fractionDigits: 4 }),
          },
          {
            name: 'Revenue per User',
            type: 'mean',
            baseline: faker.number.float({ min: 10, max: 50, fractionDigits: 2 }),
            target: faker.number.float({ min: 51, max: 80, fractionDigits: 2 }),
          },
        ],
        winner_variant: result === 'WON' ? 'Treatment' : null,
        quantitative_outcome: isFinished
          ? `Treatment improved conversion by ${faker.number.float({ min: 1, max: 20, fractionDigits: 1 })}% (p=${faker.number.float({ min: 0.001, max: 0.049, fractionDigits: 3 })})`
          : null,
        learnings: isFinished ? faker.lorem.sentences(2) : null,
        shipped: isShipped,
        started_at: startedAt,
        ended_at: endedAt,
        embedding_status: 'pending',
      })
      .returning()

    if (!exp) continue

    // Assign 1–2 random tags per experiment
    const shuffled = [...createdTags].sort(() => Math.random() - 0.5)
    const assignedTags = shuffled.slice(0, faker.number.int({ min: 1, max: 2 }))
    if (assignedTags.length > 0) {
      await db.insert(experimentTags).values(
        assignedTags.map((tag) => ({
          experiment_id: exp.id,
          tag_id: tag.id,
        })),
      )
    }

    process.stdout.write(
      `     [${String(i + 1).padStart(2, '0')}/20] ${template.name.slice(0, 55)}\n`,
    )
  }

  console.log('\n✅  Seed complete.')
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(() => {
    void pool.end()
  })
