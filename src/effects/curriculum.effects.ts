// src/effects/curriculum.effects.ts
import { Observable } from 'rxjs'
import type { Action }         from '../mvu/actions'
import type { CurriculumJson } from '../curriculum/types'

export function fetchCurriculum(domain: string): Observable<Action> {
	return new Observable<Action>(observer => {
		fetch(`/api/domains/${domain}/curriculum`)
			.then(res => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				return res.json() as Promise<CurriculumJson>
			})
			.then(data => {
				observer.next({
					type:        'CURRICULUM_LOADED',
					topics:      data.topics,
					families:    data.families,
					tutorConfig: data.tutorConfig,
				})
				observer.complete()
			})
			.catch(err => {
				observer.next({ type: 'CURRICULUM_FAILED', error: String(err) })
				observer.complete()
			})
	})
}
