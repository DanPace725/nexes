# Nexes - E² Relational Intelligence Platform

> "Slack-for-AI-and-people that thinks with you"

A collaborative intelligence platform where humans and AIs work together as peers, with context that travels, uncertainty that's visible, and knowledge that flows without loss across conversations, documents, and time.

## Project Status: Early Development 🚧

This project is in the initial development phase, implementing the vision outlined in our [foundational documentation](./docs/).

## Core Principles

- **Everything exists in relationship** - Our fundamental postulate (E²)
- **Context travels with content** - Meaning doesn't get lost in transmission  
- **Uncertainty is made visible** - Systems acknowledge their limits
- **Knowledge flows without loss** - Across humans, AIs, and hybrid collaborations

## Architecture Overview

### Phase 1: MVP Foundation (Current)
- Basic chat interface with AI integration
- ORMD document creation and editing  
- Context preservation across conversations
- Simple lineage tracking
- Obsidian vault export

### Technology Stack
- **Base Platform**: Rocket.Chat (modified)
- **AI Orchestration**: LangGraph + OpenRouter
- **Knowledge Management**: Obsidian integration
- **Data Layer**: PouchDB/CouchDB (local-first)
- **Formats**: ORMD (Organizational Relational Markdown)

## Getting Started

### Prerequisites
- Node.js 18+ 
- Yarn 4+
- Docker (for development database)

### Quick Start
```bash
# Clone and setup
git clone <repository-url>
cd nexes

# Start development database
yarn start:mongo

# Install dependencies (when ready)
yarn install

# Start development server (when implemented)
yarn dev
```

### Current Development Status

#### ✅ Completed
- [x] Foundational documentation and ethos
- [x] Project structure initialization
- [x] MongoDB development environment

#### 🚧 In Progress  
- [ ] Rocket.Chat development environment setup
- [ ] ORMD format implementation
- [ ] Basic context bundle storage

#### 📋 Planned
- [ ] AI integration layer
- [ ] Obsidian synchronization
- [ ] Context-aware chat interface
- [ ] Lineage tracking system

## Documentation

- [Foundational Ethos](./docs/01_foundational_ethos.ormd) - Why this project exists
- [Design Axioms](./docs/02_design_axioms_guardrails.ormd) - Non-negotiable principles  
- [Protocol Reference](./docs/03_protocol_reference.ormd) - How-to operational guide
- [Data Specifications](./docs/04_data_artifact_specification.ormd) - Technical formats
- [MVP Playbook](./docs/05_mvp_playbook.ormd) - Implementation roadmap
- [Relational Compass](./docs/06_relational_compass.ormd) - Ethical guidance

## Contributing

This project embodies its own principles - we build *with* coherence, not just *for* efficiency. See our [Relational Compass](./docs/06_relational_compass.ormd) for guidance on how we work together.

## License

MIT License - See [LICENSE](./LICENSE) for details.

---

*"The system is not the cause, it is the condition."*
