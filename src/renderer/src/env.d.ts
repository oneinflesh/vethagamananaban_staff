/// <reference types="vite/client" />
interface Window { office: { minimize(): void; maximize(): void; close(): void; ping(): Promise<boolean>; login(identifier: string, password: string): Promise<import('./features/auth/auth').Staff> } }
