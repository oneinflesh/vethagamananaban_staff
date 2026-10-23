
declare global {
  interface Window {
    office: { minimize(): void; maximize(): void; close(): void }
  }
}
