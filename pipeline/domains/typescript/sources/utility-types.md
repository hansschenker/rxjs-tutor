# TypeScript Utility Types

Utility types are built-in generic types that transform existing types into new ones.

## Module: Utility Types

### Partial
Makes all properties of type T optional.

**Syntax:** `Partial<T>`

**Examples:**
```typescript
// Making user update fields optional
interface User { name: string; age: number; email: string }
type UserUpdate = Partial<User>
// Equivalent to: { name?: string; age?: number; email?: string }
const update: UserUpdate = { name: 'Alice' } // valid
```

**See Also:** Required, Readonly

---

### Required
Makes all properties of type T required (removes `?` modifiers).

**Syntax:** `Required<T>`

**Examples:**
```typescript
interface Config { debug?: boolean; port?: number }
type FullConfig = Required<Config>
// Equivalent to: { debug: boolean; port: number }
const cfg: FullConfig = { debug: true, port: 3000 }
```

**See Also:** Partial

---

### Readonly
Makes all properties of type T readonly — prevents reassignment after creation.

**Syntax:** `Readonly<T>`

**Examples:**
```typescript
interface Point { x: number; y: number }
const origin: Readonly<Point> = { x: 0, y: 0 }
// origin.x = 1  // Error: Cannot assign to 'x' (read-only property)
```

**See Also:** Partial, Required

---

### Pick
Creates a new type by selecting a subset K of properties from T.

**Syntax:** `Pick<T, K extends keyof T>`

**Examples:**
```typescript
interface User { name: string; age: number; email: string; password: string }
type UserPreview = Pick<User, 'name' | 'email'>
// Equivalent to: { name: string; email: string }
```

**See Also:** Omit

---

### Omit
Creates a new type by removing properties K from T.

**Syntax:** `Omit<T, K extends keyof T>`

**Examples:**
```typescript
interface User { name: string; age: number; password: string }
type PublicUser = Omit<User, 'password'>
// Equivalent to: { name: string; age: number }
```

**See Also:** Pick

---

### Record
Creates an object type with keys K and values of type V.

**Syntax:** `Record<K extends keyof any, V>`

**Examples:**
```typescript
type CityPopulation = Record<string, number>
const cities: CityPopulation = { Zurich: 420000, Berlin: 3700000 }

type Status = 'idle' | 'loading' | 'error' | 'success'
type StatusMessages = Record<Status, string>
```

**See Also:** Pick, Partial

---

### Extract
Extracts types from union T that are assignable to U.

**Syntax:** `Extract<T, U>`

**Examples:**
```typescript
type Events = 'click' | 'focus' | 'blur' | 'keydown'
type MouseEvents = Extract<Events, 'click' | 'focus'>
// Result: 'click' | 'focus'
```

**See Also:** Exclude, NonNullable

---

### Exclude
Removes types from union T that are assignable to U.

**Syntax:** `Exclude<T, U>`

**Examples:**
```typescript
type Events = 'click' | 'focus' | 'blur' | 'keydown'
type KeyboardEvents = Exclude<Events, 'click' | 'focus'>
// Result: 'blur' | 'keydown'
```

**See Also:** Extract, Omit

---

### NonNullable
Removes `null` and `undefined` from type T.

**Syntax:** `NonNullable<T>`

**Examples:**
```typescript
type MaybeString = string | null | undefined
type DefiniteString = NonNullable<MaybeString>
// Result: string
```

**See Also:** Exclude

---

### ReturnType
Extracts the return type of a function type T.

**Syntax:** `ReturnType<T extends (...args: any) => any>`

**Examples:**
```typescript
function getUser() { return { name: 'Alice', age: 30 } }
type User = ReturnType<typeof getUser>
// Equivalent to: { name: string; age: number }
```

**See Also:** Parameters, InstanceType

---

### Parameters
Extracts the parameter types of a function type T as a tuple.

**Syntax:** `Parameters<T extends (...args: any) => any>`

**Examples:**
```typescript
function createUser(name: string, age: number, admin: boolean) { /* ... */ }
type CreateUserArgs = Parameters<typeof createUser>
// Equivalent to: [name: string, age: number, admin: boolean]
```

**See Also:** ReturnType
