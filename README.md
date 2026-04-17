# dasdasdsa

A production-ready item-manager application built with **vanilla HTML, CSS, and JavaScript** following **Clean Architecture** principles. No build tools or bundlers are required — the app runs directly in any modern browser using native ES Modules.

---

## Table of Contents

1. [Features](#features)
2. [Prerequisites](#prerequisites)
3. [Setup & Running](#setup--running)
4. [Available Scripts](#available-scripts)
5. [Project Structure](#project-structure)
6. [Clean Architecture Layers](#clean-architecture-layers)
7. [Adding New Features](#adding-new-features)
8. [Tech Stack](#tech-stack)
9. [License](#license)

---

## Features

- ✅ Add, complete, and delete items
- 💾 Persistence via `localStorage` (swappable — see [Adding New Features](#adding-new-features))
- 🎨 Responsive, accessible UI with dark-mode support
- 🧪 Unit tests for every architectural layer
- 🔍 ESLint + Prettier code quality tooling
- 🏛️ Full Clean Architecture layer separation

---

## Prerequisites

- **Node.js** ≥ 18 (only needed for the dev server and tests; not required to open the app in a browser)
- A modern browser with ES Module support (Chrome 61+, Firefox 60+, Safari 11+)

---

## Setup & Running

### 1 — Clone and install dev dependencies

```bash
git clone <your-repo-url>
cd dasdasdsa
npm install
```

### 2a — Open directly in the browser (no server)

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

> **Note:** Some browsers block ES Module imports from `file://` URLs.
> Use option 2b or 2c if you see import errors.

### 2b — Serve with the built-in Node server

```bash
npm start
# → http://localhost:3000
```

### 2c — Serve with live-reload (auto-refreshes on file changes)

```bash
npm run dev
# → http://localhost:3000
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm start` | Start the production Node.js static server on port 3000 |
| `npm run dev` | Start live-server with auto-reload |
| `npm test` | Run all Jest unit tests |
| `npm run lint` | Lint all JS source files with ESLint |
| `npm run format` | Format source files with Prettier |

---

## Project Structure

```
dasdasdsa/
├── index.html                          # Application shell / entry HTML
├── package.json
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── README.md
│
└── src/
    ├── domain/                         # Business rules — no external dependencies
    │   ├── entities/
    │   │   └── Item.js                 # Item entity with invariant enforcement
    │   ├── value-objects/
    │   │   ├── ItemId.js               # Immutable id wrapper
    │   │   └── ItemStatus.js           # Status enum value object
    │   ├── repositories/
    │   │   └── IItemRepository.js      # Repository interface (contract)
    │   ├── services/
    │   │   └── ItemDomainService.js    # Cross-entity domain logic
    │   └── exceptions/
    │       └── DomainException.js      # Domain error base class
    │
    ├── application/                    # Use cases — orchestrates domain objects
    │   ├── use-cases/
    │   │   ├── CreateItemUseCase.js
    │   │   ├── GetAllItemsUseCase.js
    │   │   ├── GetItemByIdUseCase.js
    │   │   ├── CompleteItemUseCase.js
    │   │   └── DeleteItemUseCase.js
    │   ├── dtos/
    │   │   └── ItemDTO.js              # Immutable output contract
    │   ├── mappers/
    │   │   └── ItemMapper.js           # Entity ↔ DTO conversion
    │   ├── exceptions/
    │   │   └── ApplicationException.js
    │   └── utils/
    │       └── generateId.js           # UUID generator (no deps)
    │
    ├── infrastructure/                 # I/O adapters — implements domain interfaces
    │   └── repositories/
    │       ├── InMemoryItemRepository.js     # For tests / development
    │       └── LocalStorageItemRepository.js # Browser-native persistence
    │
    └── interfaces/                     # Entry points — thin adapters to use cases
        ├── app.js                      # Composition root / browser bootstrap
        ├── server.js                   # Node.js static file server
        ├── controllers/
        │   └── ItemController.js       # Validates input, calls use cases
        ├── views/
        │   └── renderApp.js            # DOM renderer
        └── styles/
            ├── reset.css
            ├── tokens.css              # CSS custom properties / design tokens
            ├── main.css                # Layout & base styles
            └── components.css         # UI component styles
```

---

## Clean Architecture Layers

This project strictly follows [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html). Dependencies **only point inward**:

```
interfaces → application → domain
infrastructure → application → domain
```

### 🟣 Domain (`src/domain/`)

The innermost layer. Contains **all business rules** with zero knowledge of the outside world.

- **Entities** — objects with identity and lifecycle. They protect their own invariants in the constructor (e.g. `Item` throws `DomainException` on invalid name).
- **Value Objects** — immutable, equality by value (e.g. `ItemId`, `ItemStatus`).
- **Repository Interfaces** — describe *what* persistence operations exist, not *how* they work.
- **Domain Services** — logic that spans multiple entities (e.g. duplicate-name check).
- **Forbidden imports:** `application/`, `infrastructure/`, `interfaces/`, third-party libs.

### 🔵 Application (`src/application/`)

Orchestrates domain objects to fulfil use cases. Knows *what* to do, not *how*.

- **Use Cases** — one class per use case, one `execute(dto)` method. Receive dependencies via constructor (Dependency Injection).
- **DTOs** — frozen plain objects that cross layer boundaries.
- **Mappers** — convert entities ↔ DTOs.
- **Forbidden imports:** `infrastructure/`, `interfaces/`, ORM/HTTP libs.

### 🟠 Infrastructure (`src/infrastructure/`)

All I/O lives here. Implements interfaces defined in domain/application.

- **Repository Implementations** — `InMemoryItemRepository` (tests/dev), `LocalStorageItemRepository` (browser).
- To swap persistence, implement `IItemRepository` and update `src/interfaces/app.js` — nothing else changes.
- **Forbidden imports:** `interfaces/`, business logic of any kind.

### 🟢 Interfaces (`src/interfaces/`)

Thin adapters between the external world and use cases.

- **Controllers** — validate raw input, call use cases, return result objects.
- **Views** — DOM rendering. Never holds business logic.
- **Entry Points** — `app.js` (browser composition root), `server.js` (Node.js static server).
- **Forbidden imports:** `domain/` entities directly, `infrastructure/` directly.

---

## Adding New Features

### Swap persistence (e.g. to a REST API)

1. Create `src/infrastructure/repositories/ApiItemRepository.js` that implements `IItemRepository`.
2. In `src/interfaces/app.js`, replace `LocalStorageItemRepository` with `ApiItemRepository`.
3. Nothing else changes.

### Add a new use case

1. Create `src/application/use-cases/MyNewUseCase.js` with an `execute(dto)` method.
2. Add a method to `src/interfaces/controllers/ItemController.js` that calls it.
3. Wire the UI action in `src/interfaces/views/renderApp.js`.

---

## Tech Stack

| Concern | Technology |
|---|---|
| UI | HTML5, CSS3 (custom properties), Vanilla JS (ES2022) |
| Module system | Native ES Modules (`type="module"`) |
| Persistence | `localStorage` (browser) / in-memory (tests) |
| Dev server | Node.js built-in `http` / `live-server` |
| Testing | Jest |
| Linting | ESLint (eslint:recommended) |
| Formatting | Prettier |

---

## License

MIT
