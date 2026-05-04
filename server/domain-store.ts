import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface Domain {
	id:          string
	name:        string
	description: string
	createdAt:   string
	lastRun:     string | null
	topicCount:  number | null
}

interface DomainRegistry {
	domains: Domain[]
}

export function createDomainStore(dataDir: string) {
	const registryPath = join(dataDir, 'domains.json')

	function readRegistry(): DomainRegistry {
		if (!existsSync(registryPath)) return { domains: [] }
		return JSON.parse(readFileSync(registryPath, 'utf-8')) as DomainRegistry
	}

	function writeRegistry(registry: DomainRegistry): void {
		mkdirSync(dataDir, { recursive: true })
		writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8')
	}

	return {
		getDomains(): Domain[] {
			return readRegistry().domains
		},

		getDomain(id: string): Domain | undefined {
			return readRegistry().domains.find(d => d.id === id)
		},

		addDomain(domain: Domain): void {
			const registry = readRegistry()
			registry.domains.push(domain)
			writeRegistry(registry)
		},

		updateDomain(id: string, patch: Partial<Domain>): void {
			const registry = readRegistry()
			const idx      = registry.domains.findIndex(d => d.id === id)
			if (idx === -1) throw new Error(`Domain not found: ${id}`)
			registry.domains[idx] = { ...registry.domains[idx]!, ...patch }
			writeRegistry(registry)
		},
	}
}

export const domainStore = createDomainStore(join(process.cwd(), 'data'))
