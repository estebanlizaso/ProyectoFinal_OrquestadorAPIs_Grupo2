import {
  isOutOfScope,
  type ContextMap,
  type OrchestrationNodeResponse,
  type OrchestrationRelationResponse,
  type ProjectMessageResponse,
} from '../global-context'
import { PROJECT_CONTEXT_EXPORT_TEXTS } from './constants'

export type ProjectContextMarkdownInput = {
  projectName: string
  initialPrompt: string
  messages: ProjectMessageResponse[]
  map: ContextMap
}

const TEXTS = PROJECT_CONTEXT_EXPORT_TEXTS

function buildList(items: string[]): string[] {
  return items.map((item) => `- ${item}`)
}

function buildConversation(messages: ProjectMessageResponse[]): string[] {
  if (messages.length === 0) {
    return [TEXTS.noMessages]
  }
  return messages.flatMap(({ humanQuestion, chatBot }, index) => [
    `### ${TEXTS.message(index + 1)}`,
    '',
    `**${TEXTS.user}:**`,
    '',
    humanQuestion,
    '',
    `**${TEXTS.ai}:**`,
    '',
    chatBot.message,
    '',
  ])
}

function buildFlowSummary(messages: ProjectMessageResponse[]): string[] {
  const latest = messages.findLast(({ chatBot }) => !isOutOfScope(chatBot))
  if (latest === undefined) {
    return []
  }
  const { summary, plan, assumptions, language } = latest.chatBot
  return [
    `## ${TEXTS.flowSummary}`,
    '',
    summary,
    '',
    ...(plan.length > 0 ? [`### ${TEXTS.plan}`, '', ...buildList(plan), ''] : []),
    ...(assumptions.length > 0 ? [`### ${TEXTS.assumptions}`, '', ...buildList(assumptions), ''] : []),
    ...(language ? [`**${TEXTS.language}:** ${language}`, ''] : []),
  ]
}

function buildNodeField(label: string, value: string | null): string[] {
  return value ? [`- **${label}:** ${value}`] : []
}

function buildNode({ key, name, kind, description, role, responsibility, userNotes }: OrchestrationNodeResponse): string[] {
  const notes = userNotes?.split('\n').filter((line) => line.trim() !== '') ?? []
  return [
    `### ${name} (\`${key}\`)`,
    '',
    ...buildNodeField(TEXTS.kind, kind),
    ...buildNodeField(TEXTS.description, description),
    ...buildNodeField(TEXTS.role, role),
    ...buildNodeField(TEXTS.responsibility, responsibility),
    ...(notes.length > 0 ? [`- **${TEXTS.notes}:**`, ...notes.map((line) => `  - ${line.trim()}`)] : []),
    '',
  ]
}

function buildRelation(
  { from, to, label, operation, description }: OrchestrationRelationResponse,
  namesByKey: Map<string, string>,
): string {
  const route = `${namesByKey.get(from) ?? from} → ${namesByKey.get(to) ?? to}`
  const details = [label, operation ? `\`${operation}\`` : null, description].filter(
    (detail): detail is string => detail !== null && detail.trim() !== '',
  )
  return details.length > 0 ? `- ${route}: ${details.join(' · ')}` : `- ${route}`
}

function buildMap({ nodes, relations }: ContextMap): string[] {
  if (nodes.length === 0) {
    return [`## ${TEXTS.modules}`, '', TEXTS.noMap, '']
  }
  const namesByKey = new Map(nodes.map((node) => [node.key, node.name]))
  return [
    `## ${TEXTS.modules}`,
    '',
    ...nodes.flatMap(buildNode),
    `## ${TEXTS.relations}`,
    '',
    ...(relations.length > 0 ? relations.map((relation) => buildRelation(relation, namesByKey)) : [TEXTS.noRelations]),
    '',
  ]
}

export function buildProjectContextMarkdown({
  projectName,
  initialPrompt,
  messages,
  map,
}: ProjectContextMarkdownInput): string {
  const isInitialPromptRepeated = messages[0]?.humanQuestion.trim() === initialPrompt.trim()
  return [
    `# ${TEXTS.title(projectName)}`,
    '',
    ...(isInitialPromptRepeated ? [] : [`## ${TEXTS.initialPrompt}`, '', initialPrompt, '']),
    `## ${TEXTS.conversation}`,
    '',
    ...buildConversation(messages),
    ...buildFlowSummary(messages),
    ...buildMap(map),
  ].join('\n')
}
