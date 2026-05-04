# TypeScript Generics

Generics allow writing reusable code that works with multiple types while preserving type safety.

## Module: Generics

### Generic Functions
Functions parameterized by type, preserving the relationship between input and output types.

**Syntax:** `function name<T>(param: T): T`

**Examples:**
```typescript
// Identity: returns whatever type is passed in
function identity<T>(value: T): T { return value }
const n = identity(42)       // type: number
const s = identity('hello')  // type: string

// First element of array
function first<T>(arr: readonly T[]): T | undefined { return arr[0] }
const num = first([1, 2, 3])  // type: number | undefined
```

**See Also:** Generic Constraints, Generic Interfaces

---

### Generic Constraints
Restrict what types a type parameter can accept using `extends`.

**Syntax:** `<T extends Constraint>`

**Examples:**
```typescript
// Only accept values with a .length property
function logLength<T extends { length: number }>(value: T): number {
  console.log(value.length)
  return value.length
}
logLength('hello')     // 5
logLength([1, 2, 3])   // 3
// logLength(42)        // Error: number has no 'length'

// Access a property by key
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
```

**See Also:** Generic Functions, keyof

---

### Conditional Types
Types that resolve to one of two types based on whether T extends U.

**Syntax:** `T extends U ? TrueType : FalseType`

**Examples:**
```typescript
type IsString<T> = T extends string ? true : false
type A = IsString<string>   // true
type B = IsString<number>   // false

// Unwrap array element type
type ElementOf<T> = T extends Array<infer U> ? U : never
type Num = ElementOf<number[]>   // number
type Never = ElementOf<string>   // never
```

**See Also:** infer keyword, Mapped Types

---

### Mapped Types
Transform every property of an existing type using a type-level loop.

**Syntax:** `{ [K in keyof T]: TransformedType }`

**Examples:**
```typescript
// Make all values optional and nullable
type Nullish<T> = { [K in keyof T]?: T[K] | null }

// Create getter function for every property
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}
interface Point { x: number; y: number }
type PointGetters = Getters<Point>
// { getX: () => number; getY: () => number }
```

**See Also:** Conditional Types, keyof, Partial

---

### Template Literal Types
Construct string literal types using template syntax, enabling type-safe string patterns.

**Syntax:** `` `prefix${UnionType}suffix` ``

**Examples:**
```typescript
type Direction = 'top' | 'bottom' | 'left' | 'right'
type MarginProp = `margin-${Direction}`
// 'margin-top' | 'margin-bottom' | 'margin-left' | 'margin-right'

// Generate event handler names from event names
type EventHandler<T extends string> = `on${Capitalize<T>}`
type ClickHandler = EventHandler<'click'>   // 'onClick'
type ChangeHandler = EventHandler<'change'> // 'onChange'
```

**See Also:** Mapped Types, Conditional Types
