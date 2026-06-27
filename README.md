# BagiBagiBisaKali 🧾🤝

A lightweight, offline-first web app designed to solve the ultimate friend-group problem: splitting bills when multiple people pay for different things across multiple venues. 

No accounts, no backend, no friction. Just open the app, log the expenses, and share the settlement screenshot.

## 🎯 The Problem
You're out with 5 friends. Over the course of a day, you hit 2 cafes and a restaurant. Person A pays for the first cafe, Person B for the second, and Person C for dinner. Figuring out who owes what manually is a mathematical nightmare.

## ✨ The Solution
**BagiBagiBisaKali** acts as your group's bookkeeper. One person (the "operator") logs the expenses on the go. The app calculates the exact fair share for everyone, simplifies the debts to the minimum number of transactions, and generates a beautiful, screenshot-ready settlement screen to drop in the group chat.

##  Key Features

- **100% Offline & Private:** No backend, no accounts. All data is stored locally in your browser's LocalStorage.
- **Smart Debt Simplification:** Uses a greedy algorithm to minimize the number of transfers required to settle up.
- **Flexible Splitting:** Supports equal splits (excluding people who didn't partake) and custom amounts (for the friend who ordered the expensive steak).
- **Running Ledger:** Log partial cash settlements on the fly. The app automatically recalculates the remaining debts.
- **Multi-Currency:** Create different events in different currencies (USD, EUR, IDR, etc.).
- **Screenshot-Ready UI:** A dedicated dark-mode Settlement View designed specifically to look good when screenshotted and shared.
- **WhatsApp Integration:** One-tap button to generate and share a clean text summary of the debts.

## ️ Tech Stack

- **Framework:** [Vue 3](https://vuejs.org/) (Composition API)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **State Management:** [Pinia](https://pinia.vuejs.org/)
- **Icons:** [Lucide](https://lucide.dev/)

## ‍♂️ Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd bagi-bagi-bisa-kali