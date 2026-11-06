import { createContext, useContext, useEffect, useState } from 'react'

const EmergencyDemoContext = createContext(null)
const terminal = new Set(['Fulfilled', 'Cancelled', 'Expired'])

export function EmergencyDemoProvider({ children }) {
  const [emergencies, setEmergencies] = useState([])
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now()
      setEmergencies((items) => items.map((item) => !terminal.has(item.status) && new Date(item.requiredBy).getTime() <= now ? { ...item, status: 'Expired' } : item))
    }, 30000)
    return () => window.clearInterval(timer)
  }, [])
  function createEmergency(values) {
    const item = { ...values, id: `EMG-${String(Date.now()).slice(-6)}`, status: 'New', createdAt: new Date().toISOString(), dismissed: false }
    setEmergencies((items) => [item, ...items])
  }
  function updateStatus(id, status) { setEmergencies((items) => items.map((item) => item.id === id ? { ...item, status } : item)) }
  function acknowledge(id) { setEmergencies((items) => items.map((item) => item.id === id && item.status === 'New' ? { ...item, status: 'Acknowledged' } : item)) }
  function dismiss(id) { setEmergencies((items) => items.map((item) => item.id === id ? { ...item, dismissed: true } : item)) }
  return <EmergencyDemoContext.Provider value={{ emergencies, createEmergency, updateStatus, acknowledge, dismiss }}>{children}</EmergencyDemoContext.Provider>
}

export function useEmergencyDemo() {
  const value = useContext(EmergencyDemoContext)
  if (!value) throw new Error('EmergencyDemoProvider is required')
  return value
}
