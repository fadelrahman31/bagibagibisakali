export interface Participant {
  id: string
  name: string
  color: string
  customAmount?: number 
}

export interface ExpenseSplit {
  participantId: string
  amount: number
}

export interface Expense {
  id: string
  eventId: string
  title: string
  totalAmount: number
  payerId: string
  splits: ExpenseSplit[]
  createdAt: number
}

export interface Payment {
  id: string
  eventId: string
  fromParticipantId: string
  toParticipantId: string
  amount: number
  createdAt: number
  note?: string
}

export interface Event {
  id: string
  title: string
  date: string
  currency: string
  participants: Participant[]
  expenses: Expense[]
  payments: Payment[]
}

export type CurrencyMap = {
  [key: string]: Event[]
}