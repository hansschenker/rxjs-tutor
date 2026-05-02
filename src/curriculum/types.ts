// src/curriculum/types.ts

export type OperatorFamily =
	| 'Creation'
	| 'Transformation'
	| 'Filtering'
	| 'Combination'
	| 'Multicasting'
	| 'ErrorHandling'
	| 'Utility'
	| 'Conditional'
	| 'Mathematical'
	| 'JoinCreation'
	| 'SetOperations'
	| 'Concurrency'
	| 'SingleValue'
	| 'RateLimiting'
	| 'Testing'
	| 'Inspection'
	| 'Timing'

export interface CodeExample {
	title: string
	code: string
}

export interface Operator {
	name: string
	family: OperatorFamily
	signature: string
	description: string
	marble: string
	examples: CodeExample[]
	seeAlso: string[]
	tags: string[]
}

export interface Family {
	name: OperatorFamily
	description: string
	operators: Operator[]
}
