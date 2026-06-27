import type { Event, Participant } from '../types'

export interface Settlement {
  from: Participant
  to: Participant
  amount: number
}

export function calculateSettlements(event: Event): Settlement[] {
  // 1. Initialize balances to 0
  const balances: Record<string, number> = {}
  event.participants.forEach(p => balances[p.id] = 0)

  // 2. Process Expenses
  event.expenses.forEach(exp => {
    // Payer gets credit for the full amount
    balances[exp.payerId] += exp.totalAmount
    // Each person in the split owes their share (subtract from their balance)
    exp.splits.forEach(split => {
      balances[split.participantId] -= split.amount
    })
  })

  // 3. Process Existing Payments (Interpersonal transfers)
  event.payments.forEach(pay => {
    // The person paying (from) reduces their debt (balance goes UP towards 0)
    balances[pay.fromParticipantId] += pay.amount
    // The person receiving (to) reduces their credit (balance goes DOWN towards 0)
    balances[pay.toParticipantId] -= pay.amount
  })

  // 4. Separate into Debtors (owe money) and Creditors (owed money)
  const debtors: { id: string, amount: number }[] = []
  const creditors: { id: string, amount: number }[] = []

  Object.entries(balances).forEach(([id, amount]) => {
    // Use 0.01 threshold to avoid floating point errors
    if (amount < -0.01) debtors.push({ id, amount: -amount }) 
    if (amount > 0.01) creditors.push({ id, amount })
  })

  // Sort descending for the Greedy Algorithm (match biggest debts first)
  debtors.sort((a, b) => b.amount - a.amount)
  creditors.sort((a, b) => b.amount - a.amount)

  // 5. Greedy Simplification
  const settlements: Settlement[] = []
  let i = 0, j = 0

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const amount = Math.min(debtor.amount, creditor.amount)

    if (amount > 0.01) {
      const fromP = event.participants.find(p => p.id === debtor.id)!
      const toP = event.participants.find(p => p.id === creditor.id)!
      settlements.push({ from: fromP, to: toP, amount })
    }

    debtor.amount -= amount
    creditor.amount -= amount

    if (debtor.amount < 0.01) i++
    if (creditor.amount < 0.01) j++
  }

  return settlements
}