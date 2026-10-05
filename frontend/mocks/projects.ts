import type { ProjectResponse } from '../src/features/projects/types.ts'

export const MOCK_PROJECTS: ProjectResponse[] = [
  {
    name: 'Orquestador de notificaciones',
    description: 'Distribuye notificaciones a los canales configurados.',
    projectId: 4,
    created_at: '2026-04-25',
  },
  {
    name: 'Orquestador de inventario',
    description: 'Actualiza existencias entre sistemas.',
    projectId: 3,
    created_at: '2026-03-20',
  },
  {
    name: 'Orquestador de clientes',
    description: 'Sincroniza información de clientes.',
    projectId: 2,
    created_at: '2026-02-15',
  },
  {
    name: 'Orquestador de pagos',
    description: 'Coordina el procesamiento de pagos.',
    projectId: 1,
    created_at: '2026-01-10',
  },
]
